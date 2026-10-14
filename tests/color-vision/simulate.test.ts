import { describe, expect, it } from 'vitest';
import { transformPixel, transformPixels } from '../../src/features/color-vision/simulate';

describe('transformPixel', () => {
  it.each([
    ['original', [252, 161, 4, 128]],
    ['protanopia', [213, 212, 42, 128]],
    ['deuteranopia', [218, 225, 51, 128]],
    ['tritanopia', [247, 72, 79, 128]],
    ['achromatopsia', [170, 170, 170, 128]],
  ] as const)('maps a palette pixel in %s mode', (mode, expected) => {
    expect(transformPixel(252, 161, 4, 128, mode)).toEqual(expected);
  });

  it('keeps black and white neutral for every simulation', () => {
    for (const mode of ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'] as const) {
      expect(transformPixel(0, 0, 0, 255, mode)).toEqual([0, 0, 0, 255]);
      expect(transformPixel(255, 255, 255, 255, mode)).toEqual([255, 255, 255, 255]);
    }
  });

  it('clamps channels and alpha into byte range', () => {
    expect(transformPixel(400, -20, 100, 300, 'original')).toEqual([255, 0, 100, 255]);
  });
});

describe('transformPixels', () => {
  it('transforms every pixel without mutating the source buffer', () => {
    const source = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 64]);

    const result = transformPixels(source, 'achromatopsia');

    expect(Array.from(result)).toEqual([76, 76, 76, 255, 29, 29, 29, 64]);
    expect(Array.from(source)).toEqual([255, 0, 0, 255, 0, 0, 255, 64]);
    expect(result).not.toBe(source);
  });

  it('rejects buffers that do not contain complete RGBA pixels', () => {
    expect(() => transformPixels(new Uint8ClampedArray([1, 2, 3]), 'protanopia')).toThrow(
      /RGBA/,
    );
  });
});
