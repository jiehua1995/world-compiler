import { downloadBlob, say } from "../workbench/browser";
import {
  abortable,
  boundedFetch,
  httpUrl,
  pageRange,
  parsePlaylist,
} from "./core";
async function preprocessImage(
  file: Blob,
  rotation: number,
  enhancement: string,
  threshold: number,
  signal: AbortSignal,
): Promise<Blob | File> {
  if (rotation === 0 && enhancement === "none") return file;
  const image = await createImageBitmap(file);
  try {
    signal.throwIfAborted();
    if (enhancement === "threshold" && image.width * image.height > 8_000_000)
      throw Error("Threshold preprocessing is limited to 8 million pixels.");
    const canvas = document.createElement("canvas"),
      quarterTurn = rotation % 180 !== 0;
    canvas.width = quarterTurn ? image.height : image.width;
    canvas.height = quarterTurn ? image.width : image.height;
    const context = canvas.getContext("2d");
    if (!context) throw Error("Canvas preprocessing is unavailable.");
    context.filter = enhancement === "contrast" || enhancement === "threshold"
      ? "grayscale(1) contrast(1.8)"
      : enhancement === "gray"
        ? "grayscale(1)"
        : "none";
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((rotation * Math.PI) / 180);
    context.drawImage(image, -image.width / 2, -image.height / 2);
    if (enhancement === "threshold") {
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height),
        cutoff = Math.max(0, Math.min(255, Number.isFinite(threshold) ? threshold : 160));
      for (let i = 0; i < pixels.data.length; i += 4) {
        const value = pixels.data[i]! * 0.299 + pixels.data[i + 1]! * 0.587 + pixels.data[i + 2]! * 0.114,
          binary = value >= cutoff ? 255 : 0;
        pixels.data[i] = binary;
        pixels.data[i + 1] = binary;
        pixels.data[i + 2] = binary;
      }
      context.putImageData(pixels, 0, 0);
    }
    signal.throwIfAborted();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    signal.throwIfAborted();
    if (!blob) throw Error("Could not prepare the image.");
    return blob;
  } finally {
    image.close();
  }
}
export function mount(root: HTMLElement): () => void {
  const q = <T extends HTMLElement>(name: string) =>
    root.querySelector<T>(`[data-${name}]`)!;
  const status = q("status"),
    output = q<HTMLTextAreaElement>("output"),
    progress = q<HTMLProgressElement>("progress"),
    run = q<HTMLButtonElement>("run"),
    cancel = q<HTMLButtonElement>("cancel"),
    save = q<HTMLButtonElement>("save");
  const lineResults = root.querySelector<HTMLElement>("[data-line-results]"),
    lines = root.querySelector<HTMLOListElement>("[data-lines]");
  const slug = root.dataset.lab!;
  let files: File[] = [],
    abort: AbortController | undefined,
    result: Blob | undefined,
    filename = "result.txt",
    playlist: ReturnType<typeof parsePlaylist> | undefined,
    worker:
      | Awaited<ReturnType<typeof import("tesseract.js").createWorker>>
      | undefined;
  const base = import.meta.env.BASE_URL.replace(/\/?$/, "/"),
    asset = (path: string) =>
      new URL(base + "vendor/ocr/" + path, location.href).href;
  const message = (zh: string, en: string, de: string) => say([zh, en, de]);
  function problemText(error: unknown): string {
    const detail = error instanceof Error ? error.message : String(error);
    if (/Live playlists/.test(detail))
      return message(
        "不支持直播；请选择已结束的点播播放列表。",
        detail,
        "Live-Playlists werden nicht unterstützt. Eine abgeschlossene VOD-Playlist wählen.",
      );
    if (/Encrypted, master/.test(detail))
      return message(
        "不支持加密、主播放列表、分段 MP4、字节范围或不连续视频；请提供未加密 TS 点播列表。",
        detail,
        "Verschlüsselte Streams, Master-Playlists, fMP4, Bytebereiche und Unterbrechungen werden nicht unterstützt. Eine unverschlüsselte TS-VOD-Playlist verwenden.",
      );
    if (/HTTP\(S\)|Invalid URL/.test(detail))
      return message(
        "请输入有效且不含用户名或密码的 HTTP(S) 地址。",
        detail,
        "Eine gültige HTTP(S)-Adresse ohne Benutzername oder Passwort eingeben.",
      );
    if (/fetch|HTTP \d|NetworkError|network/i.test(detail))
      return message(
        "网络请求失败。请检查网络、地址及服务器 CORS 跨域设置。",
        detail,
        "Netzwerkanfrage fehlgeschlagen. Verbindung, URL und CORS-Einstellungen des Servers prüfen.",
      );
    if (/memory limit|exceed|exceeds/i.test(detail))
      return message(
        "输入或输出超出此工具的大小、页数或像素限制。请使用较小的文件或范围。",
        detail,
        "Eingabe oder Ausgabe überschreitet das Größen-, Seiten- oder Pixellimit. Kleinere Dateien oder Seitenbereiche verwenden.",
      );
    if (/page|Page/.test(detail))
      return message(
        "页码无效或超出文档范围。请使用 1-3,5 这样的页码，留空表示全部。",
        detail,
        "Ungültiger Seitenbereich. Seiten wie 1-3,5 angeben; leer bedeutet alle Seiten.",
      );
    if (/Choose one file|Choose 1/.test(detail))
      return message(
        "请选择工具要求数量的本地文件（单个文件或最多 20 个）。",
        detail,
        "Die passende Anzahl lokaler Dateien wählen: eine Datei oder höchstens 20 Dateien.",
      );
    if (/PNG|JPEG/.test(detail))
      return message(
        "请选择有效的 PNG 或 JPEG 图片，并遵守此工具显示的大小限制。",
        detail,
        "Ein gültiges PNG- oder JPEG-Bild innerhalb der angezeigten Größenlimits wählen.",
      );
    if (/up to 20 PDF pages/.test(detail))
      return message(
        "每次最多识别 20 页，请缩小页码范围。",
        detail,
        "Pro Durchlauf höchstens 20 PDF-Seiten auswählen.",
      );
    if (/Threshold preprocessing/.test(detail))
      return message(
        "阈值处理最多支持 800 万像素；请改用灰度或缩小图片。",
        detail,
        "Schwellwertverarbeitung unterstützt höchstens 8 Megapixel.",
      );
    if (/Download the selected/.test(detail))
      return message(
        "请先点击“首次下载语言和引擎”。",
        detail,
        "Zuerst „Sprache und Engine herunterladen“ anklicken.",
      );
    if (/encrypt|password/i.test(detail))
      return message(
        "不支持加密或需要密码的 PDF。请选择未加密文件。",
        detail,
        "Verschlüsselte oder passwortgeschützte PDFs werden nicht unterstützt. Eine unverschlüsselte Datei wählen.",
      );
    if (/MPEG|packet|segment|playlist|EXTINF|M3U8/i.test(detail))
      return message(
        "播放列表或 TS 分段无效。仅支持带有效时长和 TS 包的完整未加密点播。",
        detail,
        "Ungültige Playlist oder TS-Segmente. Nur vollständige unverschlüsselte VODs mit gültigen Laufzeiten und TS-Paketen werden unterstützt.",
      );
    if (/caches|Cache|quota/i.test(detail))
      return message(
        "离线缓存不可用或存储空间不足。请检查浏览器存储权限和可用空间。",
        detail,
        "Offline-Speicher nicht verfügbar oder voll. Speicherberechtigungen und freien Platz prüfen.",
      );
    return (
      message(
        "无法处理文件；请确认格式有效。详情：",
        "Cannot process this file. Details: ",
        "Datei konnte nicht verarbeitet werden. Details: ",
      ) + detail
    );
  }
  const setResult = (blob: Blob, name: string) => {
    result = blob;
    filename = name;
    save.disabled = false;
  };
  function list() {
    const ol = q("list");
    ol.replaceChildren();
    files.forEach((file, index) => {
      const li = document.createElement("li");
      li.append(`${file.name} (${(file.size / 1e6).toFixed(2)} MB) `);
      if (slug === "pdf-desk" || slug === "image-pdf") {
        for (const [label, delta] of [
          ["↑", -1],
          ["↓", 1],
        ] as const) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = label;
          button.disabled = index + delta < 0 || index + delta >= files.length;
          button.setAttribute("aria-label", `${label} ${file.name}`);
          button.onclick = () => {
            [files[index], files[index + delta]] = [
              files[index + delta],
              files[index],
            ];
            list();
          };
          li.append(button);
        }
      }
      ol.append(li);
    });
  }
  q<HTMLInputElement>("files")?.addEventListener("change", (event) => {
    files = Array.from((event.target as HTMLInputElement).files ?? []);
    list();
    result = undefined;
    save.disabled = true;
  });
  function validateFiles(single = false) {
    if (!files.length || files.length > 20 || (single && files.length !== 1))
      throw Error("Choose " + (single ? "one file." : "1–20 files."));
    if (files.reduce((sum, file) => sum + file.size, 0) > 64_000_000)
      throw Error("Files exceed 64 MB total.");
  }
  async function operation(action: (signal: AbortSignal) => Promise<void>) {
    if (abort) return;
    abort = new AbortController();
    run.disabled = true;
    cancel.disabled = false;
    q<HTMLButtonElement>("prepare")?.setAttribute("disabled", "");
    q<HTMLButtonElement>("download")?.setAttribute("disabled", "");
    q<HTMLInputElement>("files")?.setAttribute("disabled", "");
    for (const name of ["url", "language", "range", "size", "rotation", "enhance", "threshold"])
      q(name)?.setAttribute("disabled", "");
    root
      .querySelectorAll<HTMLButtonElement>("[data-list] button")
      .forEach((button) => (button.disabled = true));
    progress.value = 0;
    result = undefined;
    save.disabled = true;
    output.value = "";
    lines?.replaceChildren();
    if (lineResults) lineResults.hidden = true;
    status.textContent = message("处理中…", "Processing…", "Wird verarbeitet…");
    try {
      await action(abort.signal);
      abort.signal.throwIfAborted();
      status.textContent = message("完成。", "Done.", "Fertig.");
      progress.value = 1;
    } catch (error) {
      status.textContent = abort.signal.aborted
        ? message("已取消。", "Cancelled.", "Abgebrochen.")
        : message(
            "处理失败：",
            "Could not process: ",
            "Verarbeitung fehlgeschlagen: ",
          ) + problemText(error);
    } finally {
      abort = undefined;
      run.disabled = false;
      cancel.disabled = true;
      q("prepare")?.removeAttribute("disabled");
      q("files")?.removeAttribute("disabled");
      for (const name of ["url", "language", "range", "size", "rotation", "enhance", "threshold"])
        q(name)?.removeAttribute("disabled");
      list();
      if (playlist) q("download")?.removeAttribute("disabled");
    }
  }
  cancel.onclick = () => {
    abort?.abort();
    if (abort)
      status.textContent = message(
        "正在取消；引擎启动完成后将释放资源…",
        "Cancelling; waiting for engine initialization to release resources…",
        "Wird abgebrochen; Engine-Initialisierung wird vor der Freigabe abgewartet…",
      );
    void worker?.terminate();
    worker = undefined;
  };
  save.onclick = () => {
    if (result) downloadBlob(result, filename);
  };
  q<HTMLButtonElement>("copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = message("已复制。", "Copied.", "Kopiert.");
    } catch {
      status.textContent = message(
        "请手动选择并复制文本。",
        "Select and copy the text manually.",
        "Text bitte manuell auswählen und kopieren.",
      );
    }
  };
  const cachedFiles = (language: string) => [
    "worker.min.js",
    "core/tesseract-core-lstm.wasm.js",
    "core/tesseract-core-lstm.wasm",
    `${language}.traineddata.gz`,
  ];
  async function ready() {
    const label = q("ready");
    if (!label) return;
    try {
      const cache = await caches.open("world-compiler-ocr-v1");
      const hits = await Promise.all(
        cachedFiles(q<HTMLSelectElement>("language").value).map((path) =>
          cache.match(asset(path)),
        ),
      );
      if (hits.every(Boolean)) await import("tesseract.js");
      label.textContent = hits.every(Boolean)
        ? message(
            "语言与 OCR 引擎已缓存 · 点击准备以载入 PDF 支持",
            "Language and OCR engine cached · prepare to load PDF support",
            "Sprache und OCR-Engine gespeichert · PDF-Unterstützung über „Vorbereiten“ laden",
          )
        : message(
            "尚未下载所选语言。",
            "Selected language is not downloaded yet.",
            "Gewählte Sprache noch nicht heruntergeladen.",
          );
    } catch {
      label.textContent = message(
        "浏览器未提供离线缓存。",
        "Offline caching is unavailable in this browser.",
        "Offline-Speicher ist in diesem Browser nicht verfügbar.",
      );
    }
  }
  q("language")?.addEventListener("change", () => void ready());
  void ready();
  q<HTMLButtonElement>("prepare")?.addEventListener(
    "click",
    () =>
      void operation(async (signal) => {
        const cache = await caches.open("world-compiler-ocr-v1"),
          paths = cachedFiles(q<HTMLSelectElement>("language").value);
        for (let i = 0; i < paths.length; i++) {
          signal.throwIfAborted();
          const url = asset(paths[i]);
          if (!(await cache.match(url))) {
            const bytes = await boundedFetch(url, signal, 40_000_000);
            await cache.put(url, new Response(bytes.slice().buffer));
          }
          progress.value = (i + 1) / paths.length;
        }
        await import("tesseract.js");
        const { preparePdfRenderer } = await import("./pdf-text");
        await preparePdfRenderer();
        await ready();
      }),
  );
  q<HTMLInputElement>("url")?.addEventListener("input", () => {
    playlist = undefined;
    q<HTMLButtonElement>("download").disabled = true;
  });
  q<HTMLButtonElement>("download")?.addEventListener(
    "click",
    () =>
      void operation(async (signal) => {
        if (!playlist) throw Error("Inspect a playlist first.");
        const selected = playlist;
        const chunks: ArrayBuffer[] = [];
        let total = 0;
        for (let i = 0; i < selected.segments.length; i++) {
          const bytes = await boundedFetch(
            selected.segments[i],
            signal,
            Math.min(32_000_000, 128_000_000 - total),
          );
          if (
            bytes.length < 188 ||
            bytes[0] !== 0x47 ||
            bytes.length % 188 !== 0
          )
            throw Error(
              "A segment is not a supported 188-byte MPEG transport stream.",
            );
          for (let offset = 188; offset < bytes.length; offset += 188)
            if (bytes[offset] !== 0x47)
              throw Error("Invalid MPEG-TS packet sync.");
          total += bytes.length;
          chunks.push(bytes.slice().buffer);
          progress.value = (i + 1) / selected.segments.length;
          status.textContent = `${i + 1} / ${selected.segments.length} · ${(total / 1e6).toFixed(1)} MB`;
        }
        setResult(new Blob(chunks, { type: "video/mp2t" }), "stream.ts");
        output.value = `${selected.segments.length} segments · ${(total / 1e6).toFixed(2)} MB\nMPEG-TS output; this is not an MP4 conversion.`;
      }),
  );
  run.onclick = () =>
    void operation(async (signal) => {
      if (slug === "stream-studio") {
        playlist = undefined;
        const url = httpUrl(q<HTMLInputElement>("url").value.trim());
        let effectiveUrl = url;
        const bytes = await boundedFetch(
          url,
          signal,
          1_000_000,
          (resolved) => (effectiveUrl = resolved),
        );
        playlist = parsePlaylist(new TextDecoder().decode(bytes), effectiveUrl);
        output.value = `${playlist.segments.length} segments · ${playlist.duration.toFixed(2)} s\n\n${playlist.segments.join("\n")}`;
        return;
      }
      validateFiles(slug === "ocr-studio" || slug === "pdf-text");
      if (slug === "ocr-studio") {
        const file = files[0],
          isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (isPdf) {
          if (file.size > 32_000_000) throw Error("PDF exceeds 32 MB.");
        } else {
          if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 20_000_000)
            throw Error("Choose a PNG/JPEG image up to 20 MB.");
          const image = await createImageBitmap(file),
            pixels = image.width * image.height;
          image.close();
          if (pixels > 32_000_000) throw Error("Image exceeds 32 million pixels.");
        }
        const language = q<HTMLSelectElement>("language").value,
          cache = await caches.open("world-compiler-ocr-v1"),
          paths = cachedFiles(language);
        if (
          !(
            await Promise.all(paths.map((path) => cache.match(asset(path))))
          ).every(Boolean)
        )
          throw Error("Download the selected language and engine first.");
        const urls: Record<string, string> = {};
        let activeWorker: typeof worker;
        try {
          for (const path of paths) {
            signal.throwIfAborted();
            const response = (await cache.match(asset(path)))!;
            const blob = await response.blob();
            urls[path] = URL.createObjectURL(
              new Blob([blob], {
                type: path.endsWith(".js")
                  ? "text/javascript"
                  : path.endsWith(".wasm")
                    ? "application/wasm"
                    : "application/octet-stream",
              }),
            );
          }
          // shortcut: baseline WASM favors broad compatibility; add SIMD after profiling large OCR jobs.
          const bootstrap = `importScripts(${JSON.stringify(urls["core/tesseract-core-lstm.wasm.js"])});const core=TesseractCore;TesseractCore=async options=>core({...options,wasmBinary:new Uint8Array(await (await fetch(${JSON.stringify(urls["core/tesseract-core-lstm.wasm"])})).arrayBuffer())});const originalFetch=fetch;self.fetch=(url,options)=>originalFetch(String(url)===${JSON.stringify(asset(`${language}.traineddata.gz`))}?${JSON.stringify(urls[`${language}.traineddata.gz`])}:url,options);importScripts(${JSON.stringify(urls["worker.min.js"])});`;
          urls.bootstrap = URL.createObjectURL(
            new Blob([bootstrap], { type: "text/javascript" }),
          );
          const { createWorker } = await import("tesseract.js");
          signal.throwIfAborted();
          const creating = createWorker(language, 1, {
            workerPath: urls.bootstrap,
            corePath: asset("core/tesseract-core-lstm.wasm.js"),
            langPath: asset(""),
            workerBlobURL: false,
            cacheMethod: "none",
            logger: (event) => {
              if (!signal.aborted) {
                const labels: Record<
                  string,
                  readonly [string, string, string]
                > = {
                  "loading tesseract core": [
                    "正在加载 OCR 引擎",
                    "Loading OCR engine",
                    "OCR-Engine wird geladen",
                  ],
                  "initializing tesseract": [
                    "正在初始化 OCR 引擎",
                    "Initializing OCR engine",
                    "OCR-Engine wird initialisiert",
                  ],
                  "loading language traineddata": [
                    "正在加载语言模型",
                    "Loading language model",
                    "Sprachmodell wird geladen",
                  ],
                  "initializing api": [
                    "正在初始化识别",
                    "Initializing recognition",
                    "Erkennung wird initialisiert",
                  ],
                  "recognizing text": [
                    "正在识别文字",
                    "Recognizing text",
                    "Text wird erkannt",
                  ],
                };
                status.textContent = labels[event.status]
                  ? say(labels[event.status])
                  : message(
                      "正在处理 OCR…",
                      "Processing OCR…",
                      "OCR wird verarbeitet…",
                    );
                progress.value = event.progress ?? 0;
              }
            },
            gzip: true,
          });
          // Keep cached blob URLs alive until initialization settles, including cancellation.
          const ocrWorker = await creating;
          activeWorker = ocrWorker;
          worker = ocrWorker;
          signal.throwIfAborted();
          lines?.replaceChildren();
          if (lineResults) lineResults.hidden = true;
          const pages: string[] = [],
            recognize = async (source: Blob, pageNumber?: number) => {
              const prepared = await preprocessImage(
                source,
                Number(q<HTMLSelectElement>("rotation").value),
                q<HTMLSelectElement>("enhance").value,
                Number(q<HTMLInputElement>("threshold").value),
                signal,
              );
              const recognized = await abortable(
                ocrWorker.recognize(prepared, {}, { blocks: true }),
                signal,
              );
              signal.throwIfAborted();
              pages.push(`${pageNumber ? `--- Page ${pageNumber} ---\n` : ""}${recognized.data.text}`);
              output.value = pages.join("\n\n");
              const recognizedLines = recognized.data.blocks?.flatMap((block) =>
                block.paragraphs.flatMap((paragraph) => paragraph.lines),
              ) ?? [];
              for (const line of recognizedLines) {
                if (!line.text.trim()) continue;
                const item = document.createElement("li"),
                  confidence = Number.isFinite(line.confidence)
                    ? `${Math.round(Math.max(0, Math.min(100, line.confidence)))}%`
                    : "—";
                item.textContent = `${pageNumber ? `Page ${pageNumber} · ` : ""}${line.text} · ${confidence}`;
                lines?.append(item);
              }
              if (lineResults) lineResults.hidden = !lines?.children.length;
            };
          if (isPdf) {
            const { renderPages } = await import("./pdf-text");
            for await (const page of renderPages(
              file,
              q<HTMLInputElement>("range").value,
              signal,
              (_value, pageNumber, total) => {
                progress.value = _value * 0.15;
                status.textContent = message(
                  `正在渲染第 ${pageNumber} 页（共 ${total} 页）…`,
                  `Rendering PDF page ${pageNumber} of ${total}…`,
                  `PDF-Seite ${pageNumber} von ${total} wird gerendert…`,
                );
              },
            )) {
              await recognize(page.image, page.pageNumber);
            }
          } else await recognize(file);
          setResult(
            new Blob([output.value], { type: "text/plain;charset=utf-8" }),
            isPdf ? `${file.name.replace(/\.pdf$/iu, "")}-ocr.txt` : "ocr.txt",
          );
        } finally {
          await activeWorker?.terminate();
          if (worker === activeWorker) worker = undefined;
          Object.values(urls).forEach(URL.revokeObjectURL);
        }
        return;
      }
      if (slug === "pdf-text") {
        if (files[0].size > 32_000_000) throw Error("PDF exceeds 32 MB.");
        const { extractText } = await import("./pdf-text");
        output.value = await extractText(
          files[0],
          q<HTMLInputElement>("range").value,
          signal,
          (value) => (progress.value = value),
        );
        setResult(
          new Blob([output.value], { type: "text/plain;charset=utf-8" }),
          "pdf-text.txt",
        );
        return;
      }
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        signal.throwIfAborted();
        const file = files[i],
          bytes = await file.arrayBuffer();
        if (slug === "pdf-desk") {
          const source = await PDFDocument.load(bytes);
          const indices = pageRange(
            q<HTMLInputElement>("range").value,
            source.getPageCount(),
          );
          if (pdf.getPageCount() + indices.length > 2000)
            throw Error("Output exceeds 2000 pages.");
          for (const page of await pdf.copyPages(source, indices))
            pdf.addPage(page);
        } else {
          if (!["image/png", "image/jpeg"].includes(file.type))
            throw Error("Only PNG and JPEG images are supported.");
          const bitmap = await createImageBitmap(file);
          const pixels = bitmap.width * bitmap.height;
          bitmap.close();
          if (pixels > 32_000_000)
            throw Error("Image exceeds 32 million pixels.");
          const image =
              file.type === "image/png"
                ? await pdf.embedPng(bytes)
                : await pdf.embedJpg(bytes),
            size = q<HTMLSelectElement>("size").value;
          const [width, height] =
            size === "image"
              ? [image.width * 0.75, image.height * 0.75]
              : size === "letter"
                ? [612, 792]
                : [595.28, 841.89];
          const page = pdf.addPage([width, height]),
            margin = size === "image" ? 0 : 24,
            scale = Math.min(
              (width - 2 * margin) / image.width,
              (height - 2 * margin) / image.height,
            );
          page.drawImage(image, {
            x: (width - image.width * scale) / 2,
            y: (height - image.height * scale) / 2,
            width: image.width * scale,
            height: image.height * scale,
          });
        }
        progress.value = (i + 1) / files.length;
      }
      signal.throwIfAborted();
      const bytes = await pdf.save();
      signal.throwIfAborted();
      setResult(
        new Blob([bytes.slice().buffer], { type: "application/pdf" }),
        slug === "pdf-desk" ? "pages.pdf" : "images.pdf",
      );
      output.value = `${pdf.getPageCount()} pages · ${(bytes.length / 1e6).toFixed(2)} MB`;
    });
  return () => {
    abort?.abort();
    void worker?.terminate();
  };
}
