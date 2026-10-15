import { describe, expect, it } from 'vitest';
import { simulationMatrix } from '../../src/features/color-vision/matrices';
import { transformPixel, transformPixels } from '../../src/features/color-vision/simulate';

describe('transformPixel', () => {
  it.each([
    ['original', [252, 161, 4, 128]],
    ['protanopia', [191, 168, 0, 128]],
    ['deuteranopia', [213, 190, 15, 128]],
    ['tritanopia', [255, 138, 137, 128]],
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

  it('applies Machado matrices in linear light and re-encodes sRGB', () => {
    expect(transformPixel(255, 0, 0, 255, 'protan', 100)).toEqual([109, 95, 0, 255]);
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

describe('Machado simulation severity', () => {
  it('clamps severity and uses identity at zero', () => {
    const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    expect(simulationMatrix('protan', -10)).toEqual(identity);
    expect(simulationMatrix('deutan', 0)).toEqual(identity);
    expect(simulationMatrix('tritan', 120)).toEqual(simulationMatrix('tritan', 100));
  });

  it('uses the published protan dichromacy matrix at one hundred percent', () => {
    expect(simulationMatrix('protan', 100)).toEqual([
      0.152286, 1.052583, -0.204868,
      0.114503, 0.786281, 0.099216,
      -0.003882, -0.048116, 1.051998,
    ]);
  });

  it('uses the published deutan and tritan dichromacy matrices at one hundred percent', () => {
    expect(simulationMatrix('deutan', 100)).toEqual([
      0.367322, 0.860646, -0.227968,
      0.280085, 0.672501, 0.047413,
      -0.011820, 0.042940, 0.968881,
    ]);
    expect(simulationMatrix('tritan', 100)).toEqual([
      1.255528, -0.076749, -0.178779,
      -0.078411, 0.930809, 0.147602,
      0.004733, 0.691367, 0.303900,
    ]);
  });

  it('linearly interpolates between published ten-percent anchors', () => {
    const at10 = simulationMatrix('protan', 10);
    const at20 = simulationMatrix('protan', 20);
    simulationMatrix('protan', 15).forEach((value, index) => {
      expect(value).toBeCloseTo(((at10[index] ?? 0) + (at20[index] ?? 0)) / 2, 12);
    });
  });

  it('returns original RGBA pixels at zero percent severity', () => {
    const source = new Uint8ClampedArray([252, 161, 4, 128]);
    expect(Array.from(transformPixels(source, 'protan', 0))).toEqual(Array.from(source));
  });
});
