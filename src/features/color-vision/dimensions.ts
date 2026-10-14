import type { Dimensions } from './types';

const maxSafeEdge = 16_384;
const maxSafePixels = 100_000_000;

function validDimension(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value > 0;
}

export function assertSafeDimensions(width: number, height: number): void {
  if (!validDimension(width) || !validDimension(height)) {
    throw new RangeError('Image dimensions must be positive finite integers.');
  }
  if (width > maxSafeEdge || height > maxSafeEdge || width * height > maxSafePixels) {
    throw new RangeError('Image dimensions exceed safe browser processing bounds.');
  }
}

export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
  maxPixels: number,
): Dimensions {
  if (!validDimension(width) || !validDimension(height)) {
    throw new RangeError('Image dimensions must be positive finite integers.');
  }
  if (!validDimension(maxEdge) || !validDimension(maxPixels)) {
    throw new RangeError('Preview limits must be positive finite integers.');
  }

  const edgeScale = maxEdge / Math.max(width, height);
  const pixelScale = Math.sqrt(maxPixels / (width * height));
  const scale = Math.min(1, edgeScale, pixelScale);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
