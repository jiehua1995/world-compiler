import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { pageRange } from "./core";
GlobalWorkerOptions.workerSrc = workerUrl;
export async function extractText(
  file: File,
  range: string,
  signal: AbortSignal,
  progress: (value: number) => void,
): Promise<string> {
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
