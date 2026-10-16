import { describe, expect, it } from 'vitest';
import { comparePalettePair, generateHarmony } from '../../src/features/color-vision/palette';

describe('color palette design', () => {
  it('generates a triadic palette from a base color at a requested count', () => {
    expect(generateHarmony('#FF0000', 3, 'triadic')).toEqual(['#FF0000', '#00FF00', '#0000FF']);
  });

  it('rejects invalid counts and colors instead of silently changing a palette', () => {
    expect(() => generateHarmony('red', 3, 'triadic')).toThrow();
    expect(() => generateHarmony('#FF0000', 1, 'triadic')).toThrow();
    expect(() => generateHarmony('#FF0000', 13, 'triadic')).toThrow();
  });

  it('compares a foreground and background in the original and every modeled view', () => {
    const results = comparePalettePair('#000000', '#FFFFFF', 70);
    expect(results).toHaveLength(9);
    expect(results[0]).toMatchObject({ mode: 'original', ratio: 21, normalAA: true, normalAAA: true });
    expect(results.map(result => result.mode)).toEqual(['original', 'protan', 'deutan', 'tritan', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia', 'blue-cone-monochromacy']);
  });
});
