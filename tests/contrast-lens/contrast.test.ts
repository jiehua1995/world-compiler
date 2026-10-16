import { describe, expect, it } from 'vitest';
import { analyzePalette, contrastRatio, evaluateContrast, parseHexColor, renderPaletteReportHtml } from '../../src/features/contrast-lens/contrast';

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

  it('audits each unique pair once and offers AA adjustments for both token roles', () => {
    const pairs = analyzePalette([
      { id: 'ink', name: 'Ink', hex: '#777777' },
      { id: 'paper', name: 'Paper', hex: '#FFFFFF' },
      { id: 'accent', name: 'Accent', hex: '#2F6DB3' },
    ]);
    expect(pairs).toHaveLength(3);
    expect(pairs[0]).toMatchObject({ firstId: 'ink', secondId: 'paper', ratio: 4.48, normalAA: false, largeAA: true });
    expect(pairs[0].firstSuggestion).toBe('#767676');
    expect(evaluateContrast(parseHexColor(pairs[0].secondSuggestion!)!, parseHexColor('#777777')!).normalAA).toBe(true);
  });

  it('limits an audit to 2–12 valid, uniquely identified color tokens', () => {
    const tokens = Array.from({ length: 12 }, (_, i) => ({ id: String(i), name: `Color ${i}`, hex: `#${i.toString(16).padStart(2, '0')}0000` }));
    expect(analyzePalette(tokens)).toHaveLength(66);
    expect(() => analyzePalette(tokens.slice(0, 1))).toThrow(RangeError);
    expect(() => analyzePalette([...tokens, { id: '12', name: 'Extra', hex: '#fff' }])).toThrow(RangeError);
    expect(() => analyzePalette([{ id: 'x', name: 'Bad', hex: 'oops' }, { id: 'y', name: 'Okay', hex: '#fff' }])).toThrow(TypeError);
    expect(() => analyzePalette([{ id: 'x', name: 'Same', hex: '#000' }, { id: 'x', name: 'Same', hex: '#fff' }])).toThrow(TypeError);
  });

  it('escapes token labels in the portable HTML report', () => {
    const html = renderPaletteReportHtml([{ id: 'x', name: '<img src=x onerror=alert(1)>', hex: '#000000' }, { id: 'y', name: 'Paper', hex: '#FFFFFF' }]);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('21:1');
    expect(html).toContain('AA');
    expect(html).toContain('AAA');
  });
});
