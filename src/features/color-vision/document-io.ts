import { decodeLocalImage, type DecodedImage } from "./image-io";
export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/iu.test(file.name);
}
export async function decodeVisionFile(
  file: File,
  page = 1,
  signal?: AbortSignal,
): Promise<DecodedImage> {
  if (isPdfFile(file)) {
    const { decodePdfPage } = await import("./pdf-io");
    signal?.throwIfAborted();
    return decodePdfPage(file, page, signal);
  }
  const image = await decodeLocalImage(file);
  if (signal?.aborted) {
    image.cleanup();
    signal.throwIfAborted();
  }
  return image;
}
