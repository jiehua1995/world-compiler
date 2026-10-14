import { assertSafeDimensions } from './dimensions';
import { ColorVisionError } from './errors';

const supportedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export interface DecodedImage {
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  cleanup(): void;
}

export interface DecodeEnvironment {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
  decode(file: File, objectUrl: string): Promise<ImageBitmap | HTMLImageElement>;
}

async function browserDecode(file: File, objectUrl: string): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in globalThis) return globalThis.createImageBitmap(file);

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The browser could not decode this image.'));
    image.src = objectUrl;
  });
}

const browserEnvironment: DecodeEnvironment = {
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  decode: browserDecode,
};

function imageDimensions(source: ImageBitmap | HTMLImageElement) {
  return source instanceof HTMLImageElement
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}

export async function decodeLocalImage(
  file: File,
  environment: DecodeEnvironment = browserEnvironment,
): Promise<DecodedImage> {
  if (!supportedTypes.has(file.type)) {
    throw new ColorVisionError('unsupported-type', 'Select a PNG, JPEG, WebP, or GIF image.');
  }

  const objectUrl = environment.createObjectURL(file);
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await environment.decode(file, objectUrl);
  } catch (cause) {
    environment.revokeObjectURL(objectUrl);
    throw new ColorVisionError('decode-failed', 'The selected file is not a decodable image.', { cause });
  }

  const { width, height } = imageDimensions(source);
  try {
    assertSafeDimensions(width, height);
  } catch (cause) {
    if ('close' in source && typeof source.close === 'function') source.close();
    environment.revokeObjectURL(objectUrl);
    const code = width > 0 && height > 0 ? 'too-large' : 'invalid-dimensions';
    throw new ColorVisionError(code, code === 'too-large' ? 'The image is too large to process safely.' : 'The image has invalid dimensions.', { cause });
  }

  let cleaned = false;
  return {
    source,
    width,
    height,
    cleanup() {
      if (cleaned) return;
      cleaned = true;
      if ('close' in source && typeof source.close === 'function') source.close();
      environment.revokeObjectURL(objectUrl);
    },
  };
}
