export interface RGB {
  r: number;
  g: number;
  b: number;
}
export interface ContrastResult {
  ratio: number;
  normalAA: boolean;
  normalAAA: boolean;
  largeAA: boolean;
  largeAAA: boolean;
}
export interface ContrastToken { id: string; name: string; hex: string; }
export interface PalettePair extends ContrastResult {
  firstId: string;
  firstName: string;
  firstHex: string;
  secondId: string;
  secondName: string;
  secondHex: string;
  nonTextAA: boolean;
  firstSuggestion: string | null;
  secondSuggestion: string | null;
}

export function parseHexColor(value: string): RGB | null {
  const hex = value.trim().replace(/^#/, "");
  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) return null;
  const full =
    hex.length === 3 ? [...hex].map((part) => part + part).join("") : hex;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

const linear = (value: number) => {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
};
const luminance = ({ r, g, b }: RGB) =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

function rawRatio(foreground: RGB, background: RGB): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

export const contrastRatio = (foreground: RGB, background: RGB): number =>
  Number(rawRatio(foreground, background).toFixed(2));

export function evaluateContrast(
  foreground: RGB,
  background: RGB,
): ContrastResult {
  const ratio = rawRatio(foreground, background);
  return {
    ratio: Number(ratio.toFixed(2)),
    normalAA: ratio >= 4.5,
    normalAAA: ratio >= 7,
    largeAA: ratio >= 3,
    largeAAA: ratio >= 4.5,
  };
}

export const toHex = (color: RGB): string =>
  "#" +
  [color.r, color.g, color.b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

export function suggestForeground(
  foreground: RGB,
  background: RGB,
  target: number,
): RGB | null {
  if (rawRatio(foreground, background) >= target) return foreground;
  const candidates: RGB[] = [];
  for (const end of [0, 255]) {
    for (let step = 1; step <= 255; step += 1) {
      const blend = (channel: number) =>
        Math.round(channel + ((end - channel) * step) / 255);
      const color = {
        r: blend(foreground.r),
        g: blend(foreground.g),
        b: blend(foreground.b),
      };
      if (rawRatio(color, background) >= target) {
        candidates.push(color);
        break;
      }
    }
  }
  const distance = (color: RGB) =>
    (color.r - foreground.r) ** 2 +
    (color.g - foreground.g) ** 2 +
    (color.b - foreground.b) ** 2;
  return candidates.sort((a, b) => distance(a) - distance(b))[0] ?? null;
}

export function analyzePalette(tokens: ContrastToken[]): PalettePair[] {
  if (tokens.length < 2 || tokens.length > 12) throw new RangeError("A palette needs 2–12 colors.");
  if (new Set(tokens.map(({ id }) => id)).size !== tokens.length || tokens.some(({ id, name }) => !id || !name.trim()))
    throw new TypeError("Palette colors need unique IDs and non-empty names.");
  const colors = tokens.map((token) => parseHexColor(token.hex));
  if (colors.some((color) => !color)) throw new TypeError("Palette colors need valid HEX values.");
  const pairs: PalettePair[] = [];
  for (let first = 0; first < tokens.length; first += 1) for (let second = first + 1; second < tokens.length; second += 1) {
    const a = tokens[first], b = tokens[second], fg = colors[first]!, bg = colors[second]!;
    const result = evaluateContrast(fg, bg);
    const firstSuggestion = result.normalAA ? null : suggestForeground(fg, bg, 4.5);
    const secondSuggestion = result.normalAA ? null : suggestForeground(bg, fg, 4.5);
    pairs.push({
      firstId: a.id, firstName: a.name, firstHex: toHex(fg), secondId: b.id, secondName: b.name, secondHex: toHex(bg),
      ...result, nonTextAA: result.ratio >= 3,
      firstSuggestion: firstSuggestion ? toHex(firstSuggestion) : null,
      secondSuggestion: secondSuggestion ? toHex(secondSuggestion) : null,
    });
  }
  return pairs;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export function renderPaletteReportHtml(tokens: ContrastToken[], language: "zh-CN" | "en" | "de" = "en"): string {
  const pairs = analyzePalette(tokens);
  const copy = {
    "zh-CN": ["对比度审查报告", "颜色对", "比例", "普通文字 AA", "普通文字 AAA", "大号文字 AA", "大号文字 AAA", "图标与控件 3:1", "通过", "未通过"],
    en: ["Color contrast audit", "Color pair", "Ratio", "Normal text AA", "Normal text AAA", "Large text AA", "Large text AAA", "Icons & controls 3:1", "Pass", "Fail"],
    de: ["Kontrastprüfbericht", "Farbpaar", "Verhältnis", "Normaler Text AA", "Normaler Text AAA", "Großer Text AA", "Großer Text AAA", "Symbole & Steuerelemente 3:1", "Bestanden", "Nicht bestanden"],
  }[language];
  const status = (pass: boolean) => pass ? copy[8] : copy[9];
  const cells = pairs.map((pair) => `<tr><th>${escapeHtml(pair.firstName)} <code>${pair.firstHex}</code><br>${escapeHtml(pair.secondName)} <code>${pair.secondHex}</code><div class="sample" style="color:${pair.firstHex};background:${pair.secondHex}">Aa 123 · ★ · Button</div></th><td>${pair.ratio}:1</td><td>${status(pair.normalAA)}</td><td>${status(pair.normalAAA)}</td><td>${status(pair.largeAA)}</td><td>${status(pair.largeAAA)}</td><td>${status(pair.nonTextAA)}</td></tr>`).join("");
  return `<!doctype html><html lang="${language}"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${copy[0]}</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:1100px;margin:2rem auto;padding:0 1rem;color:#10243b}table{border-collapse:collapse;width:100%}th,td{border:1px solid #b9c8d4;padding:.65rem;text-align:left}th{font-weight:500}.sample{padding:.35rem;margin-top:.35rem;border-radius:.25rem}code{font-size:.85em}</style><h1>${copy[0]}</h1><p>${tokens.length} · ${pairs.length} ${copy[1]}</p><table><thead><tr><th>${copy[1]}</th><th>${copy[2]}</th>${copy.slice(3, 8).map((label) => `<th>${label}</th>`).join("")}</tr></thead><tbody>${cells}</tbody></table></html>`;
}
