import { assertSafeDimensions } from './dimensions';
import { ColorVisionError } from './errors';
import { transformPixels } from './simulate';
import type { Dimensions, VisionMode } from './types';

export interface ExportOptions {
  format: 'image/png' | 'image/jpeg';
  quality?: number;
}

export interface CanvasEnvironment {
  createCanvas(): HTMLCanvasElement;
}

const browserCanvasEnvironment: CanvasEnvironment = {
  createCanvas: () => document.createElement('canvas'),
};

export async function exportSimulation(
  source: CanvasImageSource,
  dimensions: Dimensions,
  mode: VisionMode,
  options: ExportOptions,
  environment: CanvasEnvironment = browserCanvasEnvironment,
): Promise<Blob> {
  try {
    assertSafeDimensions(dimensions.width, dimensions.height);
    const canvas = environment.createCanvas();
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D is unavailable.');

    context.drawImage(source, 0, 0, dimensions.width, dimensions.height);
    const image = context.getImageData(0, 0, dimensions.width, dimensions.height);
    const pixels = transformPixels(image.data, mode);
    if (options.format === 'image/jpeg') {
      for (let index = 3; index < pixels.length; index += 4) pixels[index] = 255;
    }
    image.data.set(pixels);
    context.putImageData(image, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('The browser encoder returned no data.')),
        options.format,
        options.quality,
      );
    });
  } catch (cause) {
    if (cause instanceof ColorVisionError) throw cause;
    throw new ColorVisionError('export-failed', 'The simulated image could not be exported.', { cause });
  }
}
