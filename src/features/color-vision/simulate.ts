import { fixedSimulationMatrices, simulationMatrix } from './matrices';
import type { VisionAxis, VisionMode } from './types';

const byte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

export function transformPixel(
  r: number,
  g: number,
  b: number,
  a: number,
  mode: VisionMode,
  severity = 100,
): [number, number, number, number] {
  if (mode === 'original') return [byte(r), byte(g), byte(b), byte(a)];

  const axis: VisionAxis | undefined = mode === 'protanopia' ? 'protan'
    : mode === 'deuteranopia' ? 'deutan'
      : mode === 'tritanopia' ? 'tritan'
        : mode === 'protan' || mode === 'deutan' || mode === 'tritan' ? mode : undefined;
  const matrix = axis ? simulationMatrix(axis, severity) : fixedSimulationMatrices[mode as keyof typeof fixedSimulationMatrices];
  return [
    byte(matrix[0] * r + matrix[1] * g + matrix[2] * b),
    byte(matrix[3] * r + matrix[4] * g + matrix[5] * b),
    byte(matrix[6] * r + matrix[7] * g + matrix[8] * b),
    byte(a),
  ];
}

export function transformPixels(
  source: Uint8ClampedArray,
  mode: VisionMode,
  severity = 100,
): Uint8ClampedArray {
  if (source.length % 4 !== 0) throw new RangeError('Pixel buffer must contain complete RGBA pixels.');

  const result = new Uint8ClampedArray(source.length);
  for (let index = 0; index < source.length; index += 4) {
    const pixel = transformPixel(
      source[index] ?? 0,
      source[index + 1] ?? 0,
      source[index + 2] ?? 0,
      source[index + 3] ?? 0,
      mode,
      severity,
    );
    result.set(pixel, index);
  }
  return result;
}
