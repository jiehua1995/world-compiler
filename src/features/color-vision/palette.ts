import { evaluateContrast, type RGB } from '../contrast-lens/contrast';
import { transformPixel } from './simulate';
import type { VisionMode } from './types';

export type Harmony = 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'monochromatic';
export const paletteModes: VisionMode[] = ['original', 'protan', 'deutan', 'tritan', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia', 'blue-cone-monochromacy'];

function parseHex(hex: string): RGB {
  const match = hex.trim().match(/^#?([\da-f]{6})$/iu);
  if (!match) throw new Error('Use a six-digit HEX color.');
  return { r: Number.parseInt(match[1].slice(0, 2), 16), g: Number.parseInt(match[1].slice(2, 4), 16), b: Number.parseInt(match[1].slice(4, 6), 16) };
}

function toHsl({ r, g, b }: RGB): [number, number, number] {
  const channels = [r, g, b].map(value => value / 255), max = Math.max(...channels), min = Math.min(...channels), delta = max - min;
  let hue = 0;
  if (delta) hue = max === channels[0] ? ((channels[1] - channels[2]) / delta) % 6 : max === channels[1] ? (channels[2] - channels[0]) / delta + 2 : (channels[0] - channels[1]) / delta + 4;
  const lightness = (max + min) / 2;
  return [(hue * 60 + 360) % 360, delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0, lightness];
}

function toHex(hue: number, saturation: number, lightness: number): string {
  const h = ((hue % 360) + 360) % 360, c = (1 - Math.abs(2 * lightness - 1)) * saturation, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = lightness - c / 2;
  const rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${rgb.map(channel => Math.round((channel + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function generateHarmony(baseColor: string, count: number, harmony: Harmony): string[] {
  if (!Number.isInteger(count) || count < 2 || count > 12) throw new Error('Palette size must be between 2 and 12.');
  const [hue, saturation, lightness] = toHsl(parseHex(baseColor));
  const anchors: Record<Harmony, number[]> = {
    complementary: [0, 180], analogous: [-30, 0, 30], triadic: [0, 120, 240],
    'split-complementary': [0, 150, 210], monochromatic: [0],
  };
  return Array.from({ length: count }, (_, index) => {
    const anchor = anchors[harmony][index % anchors[harmony].length];
    const round = Math.floor(index / anchors[harmony].length);
    const lightnessOffset = round ? (round % 2 ? 1 : -1) * Math.min(.12, Math.ceil(round / 2) * .08) : 0;
    const saturationOffset = round && harmony === 'monochromatic' ? -Math.min(.28, round * .07) : 0;
    return toHex(hue + anchor, Math.max(.22, Math.min(1, saturation + saturationOffset)), Math.max(.18, Math.min(.82, lightness + lightnessOffset)));
  });
}

export function comparePalettePair(foreground: string, background: string, severity: number) {
  const fg = parseHex(foreground), bg = parseHex(background);
  const channels = (color: RGB): number[] => [color.r, color.g, color.b];
  return paletteModes.map(mode => {
    const a = mode === 'original' ? channels(fg) : [...transformPixel(fg.r, fg.g, fg.b, 255, mode, severity)];
    const b = mode === 'original' ? channels(bg) : [...transformPixel(bg.r, bg.g, bg.b, 255, mode, severity)];
    const result = evaluateContrast({ r: a[0], g: a[1], b: a[2] }, { r: b[0], g: b[1], b: b[2] });
    return { mode, ...result };
  });
}
