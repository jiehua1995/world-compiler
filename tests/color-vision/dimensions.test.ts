import { describe, expect, it } from 'vitest';
import { assertSafeDimensions, fitWithin } from '../../src/features/color-vision/dimensions';

describe('fitWithin', () => {
  it('preserves aspect ratio while respecting an edge limit', () => {
    expect(fitWithin(4000, 2000, 1600, 2_000_000)).toEqual({ width: 1600, height: 800 });
  });

  it('uses the pixel budget when it is the tighter bound', () => {
    expect(fitWithin(10_000, 10_000, 4096, 4_000_000)).toEqual({ width: 2000, height: 2000 });
  });

  it('does not upscale already safe dimensions', () => {
    expect(fitWithin(640, 480, 1600, 2_000_000)).toEqual({ width: 640, height: 480 });
  });

  it('rejects zero, non-finite, and invalid limits', () => {
    expect(() => fitWithin(0, 480, 1600, 2_000_000)).toThrow(/dimensions/i);
    expect(() => fitWithin(Number.POSITIVE_INFINITY, 480, 1600, 2_000_000)).toThrow(/dimensions/i);
    expect(() => fitWithin(640, 480, 0, 2_000_000)).toThrow(/limit/i);
  });
});

describe('assertSafeDimensions', () => {
  it('accepts a large but safe image', () => {
    expect(() => assertSafeDimensions(8000, 6000)).not.toThrow();
  });

  it('rejects zero and dimensions beyond browser-safe bounds', () => {
    expect(() => assertSafeDimensions(0, 200)).toThrow(/dimensions/i);
    expect(() => assertSafeDimensions(20_000, 10)).toThrow(/safe/i);
    expect(() => assertSafeDimensions(12_000, 12_000)).toThrow(/safe/i);
  });
});
