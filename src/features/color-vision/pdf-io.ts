import { getDocument, GlobalWorkerOptions, type RenderTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ColorVisionError } from "./errors";
import { rasterDimensions } from "./vector-io";
import type { DecodedImage } from "./image-io";

GlobalWorkerOptions.workerSrc = workerUrl;
export const MAX_PDF_BYTES = 32_000_000;
export async function decodePdfPage(
  file: File,
  pageNumber = 1,
  signal?: AbortSignal,
): Promise<DecodedImage> {
  if (file.size > MAX_PDF_BYTES)
    throw new ColorVisionError("too-large", "PDF exceeds 32 MB.");
  if (!Number.isInteger(pageNumber) || pageNumber < 1)
    throw new ColorVisionError("invalid-page", "Invalid PDF page number.");
  const data = new Uint8Array(await file.arrayBuffer());
  signal?.throwIfAborted();
  const base = import.meta.env.BASE_URL.replace(/\/?$/u, "/");
  const asset = (path: string) =>
    new URL(base + "vendor/pdfjs/" + path + "/", window.location.href).href;
  const task = getDocument({
    data,
    useSystemFonts: false,
    cMapUrl: asset("cmaps"),
    cMapPacked: true,
    iccUrl: asset("iccs"),
    standardFontDataUrl: asset("standard_fonts"),
    wasmUrl: asset("wasm"),
    maxImageSize: 32_000_000,
    canvasMaxAreaInBytes: 64_000_000,
    enableXfa: false,
  });
  let rendering: RenderTask | undefined,
    canvas: HTMLCanvasElement | undefined,
    released = false;
  const cleanup = () => {
    if (released) return;
    released = true;
    signal?.removeEventListener("abort", cleanup);
    rendering?.cancel();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    void task.destroy().catch(() => {});
  };
  signal?.addEventListener("abort", cleanup, { once: true });
  try {
    signal?.throwIfAborted();
    const pdf = await task.promise;
    if (pageNumber > pdf.numPages)
      throw new ColorVisionError(
        "invalid-page",
        "Page is outside the document.",
      );
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const dimensions = rasterDimensions(viewport.width, viewport.height);
    const scale = Math.min(
      dimensions.width / viewport.width,
      dimensions.height / viewport.height,
    );
    const finalViewport = page.getViewport({ scale: 2 * scale });
    canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    rendering = page.render({
      canvas,
      viewport: finalViewport,
      background: "#ffffff",
    });
    await rendering.promise;
    signal?.throwIfAborted();
    return {
      source: canvas,
      width: canvas.width,
      height: canvas.height,
      pageCount: pdf.numPages,
      pageNumber,
      cleanup,
    };
  } catch (problem) {
    cleanup();
    if (signal?.aborted) signal.throwIfAborted();
    if (problem instanceof ColorVisionError) throw problem;
    if (problem instanceof Error && problem.name === "PasswordException")
      throw new ColorVisionError("pdf-password", "Open an unencrypted PDF.", {
        cause: problem,
      });
    throw new ColorVisionError("decode-failed", "Cannot render this PDF.", {
      cause: problem,
    });
  }
}
