export function wifiPayload(
  ssid: string,
  password: string,
  security: string,
  hidden: boolean,
): string {
  if (
    !ssid.trim() ||
    ssid.length > 100 ||
    password.length > 150 ||
    !["WPA", "WEP", "nopass"].includes(security)
  )
    throw new Error("Invalid Wi-Fi input");
  const escape = (value: string) => value.replace(/[\\;,:"]/gu, "\\$&");
  return `WIFI:T:${security};S:${escape(ssid)};P:${security === "nopass" ? "" : escape(password)};H:${hidden};;`;
}
export function convertText(text: string, mode: string): string {
  if (text.length > 200000) throw new Error("Input too large");
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  if (mode === "base64-encode")
    return btoa(
      Array.from(new TextEncoder().encode(text), (value) =>
        String.fromCharCode(value),
      ).join(""),
    );
  if (mode === "base64-decode")
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(atob(text.replace(/\s/gu, "")), (char) =>
        char.charCodeAt(0),
      ),
    );
  if (mode === "url-encode") return encodeURIComponent(text);
  if (mode === "url-decode") return decodeURIComponent(text);
  if (mode === "html-encode")
    return text.replace(/[&<>"']/gu, (char) => entities[char]);
  if (mode === "html-decode") {
    const named: Record<string, string> = {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: '"',
      apos: "'",
      nbsp: " ",
    };
    return text.replace(
      /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/giu,
      (original, key: string) => {
        if (key[0] !== "#") return named[key.toLowerCase()] ?? original;
        const code =
          key[1].toLowerCase() === "x"
            ? parseInt(key.slice(2), 16)
            : Number(key.slice(1));
        if (code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff))
          throw new Error("Invalid code point");
        return String.fromCodePoint(code);
      },
    );
  }
  throw new Error("Unknown operation");
}
export function parseTime(value: string, type: string): Date {
  let milliseconds: number;
  if (type === "iso") {
    const match = value.match(
      /^(\d{4})-(\d{2})-(\d{2})T([0-2]\d):([0-5]\d):([0-5]\d)(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/u,
    );
    if (!match) throw new Error("Use ISO with time zone");
    const [year, month, day, hour] = match.slice(1, 5).map(Number);
    const days = [
      31,
      year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ];
    if (
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > days[month - 1] ||
      hour > 23
    )
      throw new Error("Invalid calendar date");
    milliseconds = Date.parse(value);
  } else {
    if (!/^[+-]?\d+(?:\.\d+)?$/u.test(value.trim()))
      throw new Error("Invalid timestamp");
    milliseconds = Number(value) * (type === "seconds" ? 1000 : 1);
  }
  if (
    !Number.isSafeInteger(milliseconds) ||
    Math.abs(milliseconds) > 8640000000000000
  )
    throw new Error("Timestamp out of range");
  return new Date(milliseconds);
}

export function parseJsonDocument(text: string): unknown {
  if (text.length > 1000000) throw new Error("Input > 1 MB");
  const value: unknown = JSON.parse(text);
  const stack = [{ value, depth: 0 }];
  let nodes = 1;
  while (stack.length) {
    const current = stack.pop()!;
    if (current.depth > 32) throw new Error("Depth > 32");
    if (current.value !== null && typeof current.value === "object") {
      const children = Object.values(current.value);
      nodes += children.length;
      if (nodes > 20000) throw new Error("Nodes > 20000");
      for (const child of children)
        stack.push({ value: child, depth: current.depth + 1 });
    }
  }
  return value;
}
