import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { pageRange } from "./core";
let workerReady: Promise<void> | undefined;
export function preparePdfRenderer() {
  if (!workerReady)
    workerReady = fetch(workerUrl)
      .then(async (response) => {
        if (!response.ok) throw Error("Could not load the local PDF renderer.");
        GlobalWorkerOptions.workerSrc = URL.createObjectURL(
          new Blob([await response.blob()], { type: "text/javascript" }),
        );
      })
      .catch((error) => {
        workerReady = undefined;
        throw error;
      });
  return workerReady;
}
export async function extractText(
  file: File,
  range: string,
  signal: AbortSignal,
  progress: (value: number) => void,
): Promise<string> {
  await preparePdfRenderer();
  const base = import.meta.env.BASE_URL.replace(/\/?$/, "/"),
    asset = (path: string) =>
      new URL(base + "vendor/pdfjs/" + path + "/", location.href).href;
  const task = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: asset("cmaps"),
    cMapPacked: true,
    standardFontDataUrl: asset("standard_fonts"),
    wasmUrl: asset("wasm"),
    iccUrl: asset("iccs"),
    enableXfa: false,
  });
  const stop = () => {
    void task.destroy().catch(() => {});
  };
  signal.addEventListener("abort", stop, { once: true });
  try {
    signal.throwIfAborted();
    const pdf = await task.promise,
      indices = pageRange(range, pdf.numPages),
      pages: string[] = [];
    let size = 0;
    for (let i = 0; i < indices.length; i++) {
      signal.throwIfAborted();
      const page = await pdf.getPage(indices[i] + 1),
        content = await page.getTextContent();
      const text = content.items
        .map((item) =>
          "str" in item
            ? item.str + ("hasEOL" in item && item.hasEOL ? "\n" : " ")
            : "",
        )
        .join("");
      size += text.length;
      if (size > 10_000_000)
        throw Error("Extracted text exceeds 10 million characters.");
      pages.push(`--- Page ${indices[i] + 1} ---\n${text}`);
      page.cleanup();
      progress((i + 1) / indices.length);
    }
    return pages.join("\n\n");
  } finally {
    signal.removeEventListener("abort", stop);
    await task.destroy();
  }
}
export async function* renderPages(
  file: File,
  range: string,
  signal: AbortSignal,
  progress: (value: number, pageNumber: number, total: number) => void,
): AsyncGenerator<{ pageNumber: number; image: Blob }> {
  await preparePdfRenderer();
  const base = import.meta.env.BASE_URL.replace(/\/?$/, "/"),
    asset = (path: string) =>
      new URL(base + "vendor/pdfjs/" + path + "/", location.href).href;
  if (file.size > 32_000_000) throw Error("PDF exceeds 32 MB.");
  const task = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: asset("cmaps"),
    cMapPacked: true,
    standardFontDataUrl: asset("standard_fonts"),
    wasmUrl: asset("wasm"),
    iccUrl: asset("iccs"),
    enableXfa: false,
  });
  const stop = () => void task.destroy().catch(() => {});
  signal.addEventListener("abort", stop, { once: true });
  try {
    const pdf = await task.promise,
      indices = pageRange(range, pdf.numPages);
    if (indices.length > 20) throw Error("OCR supports up to 20 PDF pages per run.");
    for (let i = 0; i < indices.length; i++) {
      signal.throwIfAborted();
      const pageNumber = indices[i]! + 1,
        page = await pdf.getPage(pageNumber),
        source = page.getViewport({ scale: 1 }),
        scale = Math.min(2, Math.sqrt(12_000_000 / (source.width * source.height))),
        viewport = page.getViewport({ scale }),
        canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw Error("PDF page rendering is unavailable.");
      try {
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        signal.throwIfAborted();
        const image = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        signal.throwIfAborted();
        if (!image) throw Error("Could not render a PDF page.");
        progress((i + 1) / indices.length, pageNumber, indices.length);
        yield { pageNumber, image };
      } finally {
        page.cleanup();
        canvas.width = 0;
        canvas.height = 0;
      }
    }
  } finally {
    signal.removeEventListener("abort", stop);
    await task.destroy();
  }
}
