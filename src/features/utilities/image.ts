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
    error = get("tool-error"),
    status = get("tool-status");
  let image: DecodedImage | null = null,
    sourceFile: File | null = null,
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
    if (!selected) return;
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
    status.textContent = "";
    get("image-source").textContent = "—";
    get("image-result").textContent = "—";
    if (
      selected.size > 20000000 ||
      !["image/png", "image/jpeg", "image/webp"].includes(selected.type)
    ) {
      fail();
      return;
    }
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
    root.removeEventListener("input", input);
    root.removeEventListener("click", click);
    document.removeEventListener("worldcompiler:localechange", localeChange);
  };
}
