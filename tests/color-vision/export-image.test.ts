// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { exportSimulation, type CanvasEnvironment } from '../../src/features/color-vision/export-image';
import type { VisionMode } from '../../src/features/color-vision/types';

function canvasEnvironment(pixels: number[], fail = false) {
  let written: number[] = [];
  const context = {
    drawImage() {},
    getImageData: () => ({ data: new Uint8ClampedArray(pixels), width: 1, height: 1 }),
    createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
    putImageData: (image: ImageData) => { written = Array.from(image.data); },
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => fail ? null : context,
    toBlob: (callback: BlobCallback, type?: string) => callback(fail ? null : new Blob(['image'], { type })),
  } as unknown as HTMLCanvasElement;
  const env: CanvasEnvironment = { createCanvas: () => canvas };
  return { env, written: () => written };
}

describe('exportSimulation', () => {
  it('exports PNG while preserving transformed alpha', async () => {
    const fixture = canvasEnvironment([252, 161, 4, 40]);

    const blob = await exportSimulation({} as CanvasImageSource, { width: 1, height: 1 }, 'achromatopsia', { format: 'image/png' }, fixture.env);

    expect(blob.type).toBe('image/png');
    expect(fixture.written()).toEqual([170, 170, 170, 40]);
  });

  it('exports JPEG with opaque output pixels', async () => {
    const fixture = canvasEnvironment([252, 161, 4, 40]);

    const blob = await exportSimulation({} as CanvasImageSource, { width: 1, height: 1 }, 'original', { format: 'image/jpeg', quality: 0.8 }, fixture.env);

    expect(blob.type).toBe('image/jpeg');
    expect(fixture.written()).toEqual([252, 161, 4, 255]);
  });

  it('uses the asynchronous pixel processor when supplied', async () => {
    const fixture = canvasEnvironment([252, 161, 4, 40]);
    const transform = async (pixels: Uint8ClampedArray, mode: VisionMode, severity: number) => {
      expect(mode).toBe('protan');
      expect(severity).toBe(35);
      return new Uint8ClampedArray([1, 2, 3, pixels[3]!]);
    };

    await exportSimulation({} as CanvasImageSource, { width: 1, height: 1 }, 'protan', { format: 'image/png' }, fixture.env, transform, 35);

    expect(fixture.written()).toEqual([1, 2, 3, 40]);
  });

  it('maps unavailable canvas and encoder failures', async () => {
    const fixture = canvasEnvironment([0, 0, 0, 255], true);

    await expect(exportSimulation({} as CanvasImageSource, { width: 1, height: 1 }, 'original', { format: 'image/png' }, fixture.env)).rejects.toMatchObject({ code: 'export-failed' });
  });
});
