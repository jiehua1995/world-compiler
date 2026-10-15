import { convertText } from "./core";
import { downloadBlob, say, errorCopy } from "../workbench/browser";
export function mount(root: HTMLElement): () => void {
  const get = <T extends HTMLElement = HTMLInputElement>(name: string) =>
    root.querySelector<T>(`[data-${name}]`)!;
  const input = get<HTMLTextAreaElement>("codec-input"),
    mode = get<HTMLSelectElement>("codec-mode"),
    output = get("codec-output"),
    error = get("tool-error"),
    file = get<HTMLInputElement>("codec-file"),
    status = get("tool-status");
  let result = "",
    request = 0,
    lastError = false;
  const invalidate = () => {
    ++request;
    result = "";
    output.textContent = "";
    get<HTMLButtonElement>("codec-transfer").disabled = true;
    get<HTMLButtonElement>("codec-copy").disabled = true;
    get<HTMLButtonElement>("codec-download").disabled = true;
    status.textContent = "";
  };
  const show = () => {
    output.textContent = result;
    error.hidden = !lastError;
    error.textContent = lastError ? say(errorCopy) : "";
  };
  const run = async (fromFile = false) => {
    invalidate();
    const id = request;
    lastError = false;
    error.hidden = true;
    try {
      let value: string;
      if (fromFile || mode.value === "sha256") {
        let bytes: ArrayBuffer;
        if (fromFile) {
          const source = file.files?.[0];
          if (!source) return;
          if (source.size > 64000000) throw new Error("File too large");
          bytes = await source.arrayBuffer();
        } else
          bytes = new TextEncoder().encode(input.value).buffer as ArrayBuffer;
        const hash = await crypto.subtle.digest("SHA-256", bytes);
        value = Array.from(new Uint8Array(hash), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("");
      } else value = convertText(input.value, mode.value);
      if (id !== request) return;
      result = value;
      show();
      get<HTMLButtonElement>("codec-transfer").disabled = false;
      get<HTMLButtonElement>("codec-copy").disabled = false;
      get<HTMLButtonElement>("codec-download").disabled = false;
      status.textContent = say([
        "转换完成",
        "Conversion complete",
        "Umwandlung abgeschlossen",
      ]);
    } catch {
      if (id === request) {
        lastError = true;
        show();
      }
    }
  };
  const click = async (event: Event) => {
    const el = (event.target as Element).closest("button");
    if (!el) return;
    if (el.hasAttribute("data-codec-run")) void run();
    if (el.hasAttribute("data-codec-transfer")) {
      input.value = result;
      invalidate();
      file.value = "";
    }
    if (el.hasAttribute("data-codec-download"))
      downloadBlob(
        new Blob([result], { type: "text/plain;charset=utf-8" }),
        "world-compiler-result.txt",
      );
    if (el.hasAttribute("data-codec-copy"))
      try {
        await navigator.clipboard.writeText(result);
        status.textContent = say(["已复制", "Copied", "Kopiert"]);
      } catch {
        status.textContent = say([
          "请手动选择结果复制",
          "Select the result to copy manually",
          "Ergebnis zum Kopieren markieren",
        ]);
      }
  };
  const fileChange = () => {
    mode.value = "sha256";
    void run(true);
  };
  const localeChange = () => {
    show();
    status.textContent = "";
  };
  input.addEventListener("input", invalidate);
  mode.addEventListener("change", invalidate);
  file.addEventListener("change", fileChange);
  root.addEventListener("click", click);
  document.addEventListener("worldcompiler:localechange", localeChange);
  invalidate();
  return () => {
    ++request;
    input.removeEventListener("input", invalidate);
    mode.removeEventListener("change", invalidate);
    file.removeEventListener("change", fileChange);
    root.removeEventListener("click", click);
    document.removeEventListener("worldcompiler:localechange", localeChange);
  };
}
