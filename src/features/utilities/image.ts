import { decodeLocalImage, type DecodedImage } from "../color-vision/image-io";
import { downloadBlob, say } from "../workbench/browser";
export function cropRectangle(
  width: number,
  height: number,
  ratio: number,
): { x: number; y: number; width: number; height: number } {
  if (!Number.isFinite(ratio) || ratio <= 0)
    throw new Error("Invalid crop ratio");
  const croppedWidth = Math.min(width, height * ratio),
    croppedHeight = Math.min(height, width / ratio);
  return {
    x: (width - croppedWidth) / 2,
    y: (height - croppedHeight) / 2,
    width: croppedWidth,
    height: croppedHeight,
  };
}
export function validateOutput(width: number, height: number): void {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 8192 ||
    height > 8192 ||
    width * height > 16000000
  )
    throw new Error("Invalid output dimensions");
}
export function mount(root: HTMLElement): () => void {
  const get = <T extends HTMLElement = HTMLInputElement>(name: string) =>
    root.querySelector<T>(`[data-${name}]`)!;
  const file = get<HTMLInputElement>("image-file"),
    canvas = get<HTMLCanvasElement>("image-canvas"),
    width = get<HTMLInputElement>("image-width"),
    height = get<HTMLInputElement>("image-height"),
    download = get<HTMLButtonElement>("image-download"),
    batchDownload = get<HTMLButtonElement>("image-batch-download"),
    queue = get<HTMLOListElement>("image-queue"),
    error = get("tool-error"),
    status = get("tool-status");
  let image: DecodedImage | null = null,
    sourceFile: File | null = null,
    sourceFiles: File[] = [],
    batching = false,
    blob: Blob | null = null,
    request = 0,
    loadId = 0,
    timer: ReturnType<typeof setTimeout> | undefined;
  const aspect = () => {
    const ratio =
      get<HTMLSelectElement>("image-crop").value === "original"
        ? image!.width / image!.height
        : Number(get<HTMLSelectElement>("image-crop").value);
    return Number(get<HTMLSelectElement>("image-rotate").value) % 180 === 90
      ? 1 / ratio
      : ratio;
  };
  const fail = () => {
    blob = null;
    download.disabled = true;
    batchDownload.disabled = true;
    canvas.hidden = true;
    error.hidden = false;
    error.textContent = say([
      "无法处理：请检查图片格式、尺寸及大小（输入 20 MB / 32 MP；输出 16 MP、最长边 8192）。",
      "Cannot process: check format and size (input 20 MB / 32 MP; output 16 MP, max edge 8192).",
      "Verarbeitung fehlgeschlagen: Format und Größe prüfen (Eingabe 20 MB / 32 MP; Ausgabe 16 MP, längste Kante 8192).",
    ]);
  };
  const render = async () => {
    if (!image) return;
    const id = ++request;
    blob = null;
    download.disabled = true;
    error.hidden = true;
    try {
      const w = Number(width.value),
        h = Number(height.value);
      validateOutput(w, h);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      const format = get<HTMLSelectElement>("image-format").value,
        quality = Number(get<HTMLInputElement>("image-quality").value) / 100;
      if (format === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }
      const cropValue = get<HTMLSelectElement>("image-crop").value;
      const crop = cropRectangle(
        image.width,
        image.height,
        cropValue === "original"
          ? image.width / image.height
          : Number(cropValue),
      );
      const rotate = Number(get<HTMLSelectElement>("image-rotate").value),
        quarter = rotate % 180 === 90;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.scale(get<HTMLInputElement>("image-flip").checked ? -1 : 1, 1);
      ctx.drawImage(
        image.source,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        -(quarter ? h : w) / 2,
        -(quarter ? w : h) / 2,
        quarter ? h : w,
        quarter ? w : h,
      );
      ctx.restore();
      canvas.hidden = false;
      const next = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, format, quality),
      );
      if (id !== request) return;
      if (!next || next.type !== format) throw new Error("Format unsupported");
      blob = next;
      download.disabled = false;
      get("image-result").textContent = (blob.size / 1000).toFixed(1) + " KB";
      status.textContent =
        w + " × " + h + " px · " + format.replace("image/", "").toUpperCase();
    } catch {
      if (id === request) fail();
    }
  };
  const onFile = async () => {
    const selected = file.files?.[0];
    const id = ++loadId;
    ++request;
    clearTimeout(timer);
    image?.cleanup();
    image = null;
    blob = null;
    sourceFile = null;
    canvas.width = 0;
    canvas.height = 0;
    download.disabled = true;
    error.hidden = true;
    status.textContent = "";
    get("image-source").textContent = "—";
    get("image-result").textContent = "—";
    sourceFiles = [...(file.files ?? [])];
    queue.replaceChildren();
    for (const item of sourceFiles) {
      const row = document.createElement("li");
      const name = document.createElement("span"),
        settings = document.createElement("span"),
        result = document.createElement("small");
      name.textContent = `${item.name} · ${(item.size / 1000).toFixed(1)} KB`;
      settings.className = "image-queue__settings";
      for (const [key, value, label] of [
        ["width", width.value, ["宽度", "Width", "Breite"]],
        ["height", height.value, ["高度", "Height", "Höhe"]],
      ] as const) {
        const input = document.createElement("input");
        input.type = "number";
        input.min = "1";
        input.max = "8192";
        input.value = value;
        input.setAttribute("data-image-item-setting", "");
        input.setAttribute(`data-image-item-${key}`, "");
        input.setAttribute("aria-label", say(label));
        settings.append(input);
      }
      result.textContent = say(["待处理", "Ready", "Bereit"]);
      result.setAttribute("data-image-item-result", "");
      row.append(name, settings, result);
      queue.append(row);
    }
    batchDownload.disabled = sourceFiles.length < 2 || sourceFiles.length > 10;
    if (sourceFiles.length > 10) {
      fail();
      return;
    }
    if (sourceFiles.some((item) => item.size > 20000000 || !["image/png", "image/jpeg", "image/webp"].includes(item.type))) {
      fail();
      return;
    }
    if (!selected) return;
    try {
      const next = await decodeLocalImage(selected);
      if (id !== loadId) {
        next.cleanup();
        return;
      }
      if (next.width * next.height > 32000000) {
        next.cleanup();
        throw new Error("Too large");
      }
      image = next;
      sourceFile = selected;
      get<HTMLSelectElement>("image-crop").value = "original";
      get<HTMLSelectElement>("image-rotate").value = "0";
      const scale = Math.min(1, 2000 / Math.max(image.width, image.height));
      width.value = String(Math.max(1, Math.round(image.width * scale)));
      height.value = String(Math.max(1, Math.round(image.height * scale)));
      const firstRow = queue.querySelector("li");
      if (firstRow) {
        firstRow.querySelector<HTMLInputElement>("[data-image-item-width]")!.value = width.value;
        firstRow.querySelector<HTMLInputElement>("[data-image-item-height]")!.value = height.value;
      }
      get("image-source").textContent =
        (selected.size / 1000).toFixed(1) + " KB";
      await render();
    } catch {
      if (id === loadId) fail();
    }
  };
  const input = (event: Event) => {
    if (!image || event.target === file) return;
    const el = event.target as HTMLElement;
    if (el.hasAttribute("data-image-item-setting")) return;
    if (get<HTMLInputElement>("image-lock").checked) {
      if (el === height)
        width.value = String(
          Math.max(1, Math.round(Number(height.value) * aspect())),
        );
      else
        height.value = String(
          Math.max(1, Math.round(Number(width.value) / aspect())),
        );
    }
    ++request;
    blob = null;
    download.disabled = true;
    clearTimeout(timer);
    timer = setTimeout(() => void render(), 160);
  };
  const click = (event: Event) => {
    if ((event.target as Element).closest("[data-image-download]") && blob) {
      const ext = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1];
      downloadBlob(
        blob,
        (sourceFile?.name.replace(/\.[^.]+$/u, "") ?? "image") +
          "-compiled." +
          ext,
      );
    }
    if ((event.target as Element).closest("[data-image-batch-download]"))
      void exportBatch();
  };
  const exportBatch = async () => {
    if (batching || sourceFiles.length < 2 || sourceFiles.length > 10) return;
    batching = true;
    batchDownload.disabled = true;
    file.disabled = true;
    const controls = [...root.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select")];
    controls.forEach((control) => (control.disabled = true));
    const selectedImage = image;
    const selectedFile = sourceFile;
    const selectedWidth = width.value,
      selectedHeight = height.value;
    const rows = [...queue.children];
    let failed = false;
    try {
      for (let index = 0; index < sourceFiles.length; index++) {
        const item = sourceFiles[index]!;
        const itemWidth = rows[index]!.querySelector<HTMLInputElement>("[data-image-item-width]")!,
          itemHeight = rows[index]!.querySelector<HTMLInputElement>("[data-image-item-height]")!,
          result = rows[index]!.querySelector<HTMLElement>("[data-image-item-result]")!;
        result.textContent = say(["处理中…", "Processing…", "Wird verarbeitet…"]);
        const decoded = await decodeLocalImage(item);
        try {
          if (decoded.width * decoded.height > 32000000) throw new Error("Too large");
          image = decoded;
          sourceFile = item;
          width.value = itemWidth.value;
          height.value = itemHeight.value;
          await render();
          if (!blob) throw new Error("Could not encode image");
          const ext = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1];
          downloadBlob(blob, `${item.name.replace(/\.[^.]+$/u, "")}-${index + 1}-compiled.${ext}`);
          result.textContent = `${decoded.width} × ${decoded.height} px → ${width.value} × ${height.value} px · ${(blob.size / 1000).toFixed(1)} KB · ${say(["已导出", "Exported", "Exportiert"])}`;
        } finally {
          decoded.cleanup();
        }
      }
      status.textContent = say(["批量导出完成。", "Batch export complete.", "Stapelexport abgeschlossen."]);
    } catch {
      failed = true;
    } finally {
      image = selectedImage;
      sourceFile = selectedFile;
      width.value = selectedWidth;
      height.value = selectedHeight;
      batching = false;
      controls.forEach((control) => (control.disabled = false));
      file.disabled = false;
      batchDownload.disabled = sourceFiles.length < 2 || sourceFiles.length > 10;
      if (image) await render();
      if (failed) {
        error.hidden = false;
        error.textContent = say(["批量处理中断；请检查图片格式、尺寸及大小。", "Batch stopped; check image format and size.", "Stapelverarbeitung abgebrochen; Format und Größe prüfen."]);
      }
    }
  };
  const localeChange = () => {
    if (!error.hidden) fail();
  };
  file.addEventListener("change", onFile);
  root.addEventListener("input", input);
  root.addEventListener("click", click);
  document.addEventListener("worldcompiler:localechange", localeChange);
  return () => {
    ++loadId;
    ++request;
    clearTimeout(timer);
    image?.cleanup();
    file.removeEventListener("change", onFile);
    batchDownload.disabled = true;
    root.removeEventListener("input", input);
    root.removeEventListener("click", click);
    document.removeEventListener("worldcompiler:localechange", localeChange);
  };
}
