export function httpUrl(value: string, base?: string): string {
  const url = new URL(value, base);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw Error("Only HTTP(S) URLs without credentials are supported.");
  return url.href;
}
export function abortable<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const stop = () => reject(signal.reason);
    signal.addEventListener("abort", stop, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", stop));
  });
}
export function pageRange(value: string, count: number): number[] {
  if (!Number.isInteger(count) || count < 1 || count > 2000)
    throw Error("Documents must contain 1–2000 pages.");
  if (!value.trim()) return Array.from({ length: count }, (_, i) => i);
  const result: number[] = [];
  for (const part of value.split(",")) {
    const match = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(part);
    if (!match) throw Error("Use page numbers or ranges, for example 1-3,5.");
    const start = Number(match[1]),
      end = Number(match[2] ?? match[1]);
    if (
      start < 1 ||
      end < start ||
      end > count ||
      result.length + end - start + 1 > 2000
    )
      throw Error("Page range is outside the document or exceeds 2000 pages.");
    for (let page = start; page <= end; page++) result.push(page - 1);
  }
  return result;
}
export function parsePlaylist(
  text: string,
  base: string,
): { segments: string[]; duration: number } {
  if (text.length > 1_000_000 || !text.trimStart().startsWith("#EXTM3U"))
    throw Error("Invalid or oversized M3U8 playlist.");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.includes("#EXT-X-ENDLIST"))
    throw Error(
      "Live playlists are unsupported. Use a completed VOD playlist.",
    );
  if (
    lines.some((line) =>
      /^#EXT-X-(KEY|SESSION-KEY|BYTERANGE|MAP|STREAM-INF|MEDIA:|I-FRAME|DISCONTINUITY|GAP|PART|SKIP)/.test(
        line,
      ),
    )
  )
    throw Error(
      "Encrypted, master, fragmented, discontinuous and byte-range streams are unsupported. Supply a plain MPEG-TS VOD media playlist.",
    );
  const segments: string[] = [];
  let duration = 0,
    pending = false;
  for (const line of lines) {
    if (line.startsWith("#EXTINF:")) {
      const seconds = Number(line.slice(8).split(",")[0]);
      if (!Number.isFinite(seconds) || seconds <= 0 || pending)
        throw Error("Invalid segment duration.");
      duration += seconds;
      pending = true;
    } else if (!line.startsWith("#")) {
      if (!pending) throw Error("Segment is missing EXTINF.");
      const url = httpUrl(line, base);
      if (!new URL(url).pathname.toLowerCase().endsWith(".ts"))
        throw Error("Only MPEG-TS (.ts) segments are supported.");
      segments.push(url);
      pending = false;
    }
  }
  if (!segments.length || pending || segments.length > 2000)
    throw Error("Playlist must contain 1–2000 complete segments.");
  return { segments, duration };
}
export async function boundedFetch(
  url: string,
  signal: AbortSignal,
  limit: number,
  resolvedUrl?: (url: string) => void,
): Promise<Uint8Array> {
  const response = await fetch(httpUrl(url), {
    signal,
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok)
    throw Error(
      `HTTP ${response.status}. The source must allow browser CORS access.`,
    );
  resolvedUrl?.(httpUrl(response.url || url));
  if (Number(response.headers.get("content-length")) > limit)
    throw Error("Download exceeds the memory limit.");
  const reader = response.body?.getReader();
  if (!reader) throw Error("Streaming responses are required.");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw Error("Download exceeds the memory limit.");
      parts.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
