import QRCode from "qrcode";
import { wifiPayload } from "./core";
import { say, downloadBlob } from "../workbench/browser";
import { parseHexColor, contrastRatio } from "../contrast-lens/contrast";
export function mount(root: HTMLElement): () => void {
  const get = <T extends HTMLElement = HTMLInputElement>(name: string) =>
    root.querySelector<T>(`[data-${name}]`)!;
  const canvas = get<HTMLCanvasElement>("qr-canvas"),
    error = get("tool-error"),
    status = get("tool-status");
  let svg = "",
    request = 0,
    timer: ReturnType<typeof setTimeout> | undefined;
  const buttons = () => [
    get<HTMLButtonElement>("qr-png"),
    get<HTMLButtonElement>("qr-svg"),
  ];
  const render = async () => {
    const id = ++request;
    buttons().forEach((b) => (b.disabled = true));
    canvas.hidden = true;
    svg = "";
    error.hidden = true;
    status.textContent = "";
    const wifi = get<HTMLSelectElement>("qr-type").value === "wifi";
    get("qr-wifi").hidden = !wifi;
    get("qr-text-row").hidden = wifi;
    try {
      const text = wifi
        ? wifiPayload(
            get<HTMLInputElement>("qr-ssid").value,
            get<HTMLInputElement>("qr-password").value,
            get<HTMLSelectElement>("qr-security").value,
            get<HTMLInputElement>("qr-hidden").checked,
          )
        : get<HTMLTextAreaElement>("qr-text").value;
      if (!text || text.length > 1500) throw new Error("Invalid content");
      const dark = get<HTMLInputElement>("qr-dark").value,
        light = get<HTMLInputElement>("qr-light").value;
      if (contrastRatio(parseHexColor(dark)!, parseHexColor(light)!) < 4.5)
        throw new Error("Low contrast");
      const margin = Number(get<HTMLInputElement>("qr-margin").value);
      if (!Number.isInteger(margin) || margin < 4 || margin > 12)
        throw new Error("Invalid margin");
      const options = {
        width: 512,
        margin,
        errorCorrectionLevel: get<HTMLSelectElement>("qr-level")
          .value as QRCode.QRCodeErrorCorrectionLevel,
        color: { dark, light },
      };
      const temporary = document.createElement("canvas");
      await QRCode.toCanvas(temporary, text, options);
      const nextSvg = await QRCode.toString(text, { ...options, type: "svg" });
      if (id !== request) return;
      canvas.width = temporary.width;
      canvas.height = temporary.height;
      canvas.getContext("2d")!.drawImage(temporary, 0, 0);
      canvas.hidden = false;
      svg = nextSvg;
      buttons().forEach((b) => (b.disabled = false));
      status.textContent = say([
        "二维码已生成，请扫码测试。",
        "QR code ready. Test it with your scanner.",
        "QR-Code bereit. Bitte mit dem Scanner testen.",
      ]);
    } catch {
      if (id === request) {
        error.hidden = false;
        error.textContent = say([
          "无法生成：请检查内容、纠错等级和颜色对比度（至少 4.5:1）。",
          "Cannot generate: check content, correction level and color contrast (at least 4.5:1).",
          "Erzeugung fehlgeschlagen: Inhalt, Fehlerkorrektur und Farbkontrast (mindestens 4,5:1) prüfen.",
        ]);
      }
    }
  };
  const schedule = () => {
    ++request;
    buttons().forEach((b) => (b.disabled = true));
    canvas.hidden = true;
    clearTimeout(timer);
    timer = setTimeout(() => void render(), 180);
  };
  const click = (event: Event) => {
    const button = (event.target as Element).closest("button");
    if (!button) return;
    if (button.hasAttribute("data-qr-svg") && svg)
      downloadBlob(
        new Blob([svg], { type: "image/svg+xml" }),
        "world-compiler-qr.svg",
      );
    if (button.hasAttribute("data-qr-png") && svg)
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, "world-compiler-qr.png");
      }, "image/png");
  };
  root.addEventListener("input", schedule);
  root.addEventListener("click", click);
  document.addEventListener("worldcompiler:localechange", render);
  void render();
  return () => {
    ++request;
    clearTimeout(timer);
    root.removeEventListener("input", schedule);
    root.removeEventListener("click", click);
    document.removeEventListener("worldcompiler:localechange", render);
  };
}
