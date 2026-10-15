export interface RGB { r: number; g: number; b: number }
export interface ContrastResult { ratio: number; normalAA: boolean; normalAAA: boolean; largeAA: boolean; largeAAA: boolean }

export function parseHexColor(value: string): RGB | null {
  const hex = value.trim().replace(/^#/, '');
  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) return null;
  const full = hex.length === 3 ? [...hex].map((part) => part + part).join('') : hex;
  return { r: Number.parseInt(full.slice(0, 2), 16), g: Number.parseInt(full.slice(2, 4), 16), b: Number.parseInt(full.slice(4, 6), 16) };
}

const linear = (value: number) => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
};
const luminance = ({ r, g, b }: RGB) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

export function contrastRatio(foreground: RGB, background: RGB): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function evaluateContrast(foreground: RGB, background: RGB): ContrastResult {
  const ratio = contrastRatio(foreground, background);
  return { ratio, normalAA: ratio >= 4.5, normalAAA: ratio >= 7, largeAA: ratio >= 3, largeAAA: ratio >= 4.5 };
}
