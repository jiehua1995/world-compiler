import { describe, expect, it } from 'vitest';
import { contrastRatio, evaluateContrast, parseHexColor } from '../../src/features/contrast-lens/contrast';

describe('contrast lens', () => {
  it('parses three- and six-digit hex colors and rejects invalid values', () => {
    expect(parseHexColor('#abc')).toEqual({ r: 170, g: 187, b: 204 });
    expect(parseHexColor('000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseHexColor('#12xz00')).toBeNull();
  });

  it('calculates WCAG relative luminance contrast', () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBe(21);
    expect(contrastRatio({ r: 80, g: 80, b: 80 }, { r: 80, g: 80, b: 80 })).toBe(1);
  });

  it('reports normal and large text thresholds', () => {
    expect(evaluateContrast({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toMatchObject({ normalAA: true, normalAAA: true, largeAA: true, largeAAA: true });
    expect(evaluateContrast({ r: 120, g: 120, b: 120 }, { r: 255, g: 255, b: 255 })).toMatchObject({ normalAA: false, normalAAA: false, largeAA: true, largeAAA: false });
  });
});
