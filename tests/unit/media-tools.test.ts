import { describe, expect, it } from "vitest";
import {
  parsePlaylist,
  httpUrl,
  pageRange,
  abortable,
  boundedFetch,
} from "../../src/features/media-tools/core";
describe("media boundaries", () => {
  it("resolves VOD transport segments and duration", () => {
    expect(
      parsePlaylist(
        "#EXTM3U\n#EXTINF:2.5,\npart.ts\n#EXT-X-ENDLIST",
        "https://example.org/video/list.m3u8",
      ),
    ).toEqual({
      segments: ["https://example.org/video/part.ts"],
      duration: 2.5,
    });
  });
  it.each([
    '#EXT-X-KEY:METHOD=AES-128,URI="k"',
    "#EXT-X-BYTERANGE:100@0",
    '#EXT-X-MAP:URI="init.mp4"',
    "#EXT-X-STREAM-INF:BANDWIDTH=100",
    "#EXT-X-DISCONTINUITY",
  ])("rejects unsupported HLS: %s", (tag) => {
    expect(() =>
      parsePlaylist(
        `#EXTM3U\n${tag}\n#EXTINF:2,\na.ts\n#EXT-X-ENDLIST`,
        "https://example.org/a",
      ),
    ).toThrow();
  });
  it("rejects live playlists and non-HTTP segment URLs", () => {
    expect(() =>
      parsePlaylist("#EXTM3U\n#EXTINF:2,\na.ts", "https://example.org/a"),
    ).toThrow();
    expect(() => httpUrl("file:///tmp/private")).toThrow();
    expect(() => httpUrl("https://user:password@example.org")).toThrow();
  });
  it("keeps explicit page order and rejects invalid or excessive pages", () => {
    expect(pageRange("3,1-2", 3)).toEqual([2, 0, 1]);
    for (const value of ["0", "4", "2-1", "1,,2", "1.5", "1-999999999"])
      expect(() => pageRange(value, 3)).toThrow();
    expect(pageRange("", 3)).toEqual([0, 1, 2]);
  });
  it("cancels even when an engine promise does not settle", async () => {
    const controller = new AbortController();
    const operation = abortable(new Promise(() => {}), controller.signal);
    controller.abort();
    await expect(operation).rejects.toMatchObject({ name: "AbortError" });
  });
  it("bounds streamed responses even without a content length", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => new Response(new Uint8Array(30));
    try {
      await expect(
        boundedFetch("https://example.org", new AbortController().signal, 20),
      ).rejects.toThrow(/limit/);
    } finally {
      globalThis.fetch = original;
    }
  });
  it("uses the final playlist location after redirects", async () => {
    const original = globalThis.fetch;
    let effective = "";
    globalThis.fetch = async () => {
      const response = new Response("#EXTM3U");
      Object.defineProperty(response, "url", {
        value: "https://example.org/nested/index.m3u8",
      });
      return response;
    };
    try {
      await boundedFetch(
        "https://example.org/start",
        new AbortController().signal,
        100,
        (url) => (effective = url),
      );
      expect(effective).toBe("https://example.org/nested/index.m3u8");
    } finally {
      globalThis.fetch = original;
    }
  });
});
