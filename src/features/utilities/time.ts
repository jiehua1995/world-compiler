import { parseTime } from "./core";
import { say, errorCopy } from "../workbench/browser";
export function mount(root: HTMLElement): () => void {
  const get = <T extends HTMLElement = HTMLInputElement>(name: string) =>
    root.querySelector<T>(`[data-${name}]`)!;
  const error = get("tool-error"),
    input = get<HTMLInputElement>("time-input"),
    type = get<HTMLSelectElement>("time-type"),
    zone = get<HTMLSelectElement>("time-zone"),
    copy = get<HTMLButtonElement>("time-copy");
  let details = "";
  const update = () => {
    try {
      const date = parseTime(input.value, type.value);
      get("time-seconds").textContent = String(date.getTime() / 1000);
      get("time-ms").textContent = String(date.getTime());
      get("time-iso").textContent = date.toISOString();
      get("time-local").textContent = new Intl.DateTimeFormat(
        document.documentElement.lang,
        { dateStyle: "full", timeStyle: "long", timeZone: zone.value },
      ).format(date);
      details = [
        date.toISOString(),
        date.getTime() / 1000,
        date.getTime(),
        zone.value,
        get("time-local").textContent,
      ].join("\n");
      error.hidden = true;
      copy.disabled = false;
    } catch {
      error.hidden = false;
      error.textContent = say(errorCopy);
      copy.disabled = true;
      details = "";
      ["time-seconds", "time-ms", "time-iso", "time-local"].forEach(
        (name) => (get(name).textContent = "—"),
      );
    }
  };
  const click = async (event: Event) => {
    const button = (event.target as Element).closest("button");
    if (!button) return;
    if (button.hasAttribute("data-time-now")) {
      type.value = "milliseconds";
      input.value = String(Date.now());
      update();
    }
    if (button === copy) {
      try {
        await navigator.clipboard.writeText(details);
        get("tool-status").textContent = say(["已复制", "Copied", "Kopiert"]);
      } catch {
        get("tool-status").textContent = say([
          "请手动选择结果复制",
          "Select the result to copy manually",
          "Ergebnis zum Kopieren markieren",
        ]);
      }
    }
  };
  root.addEventListener("input", update);
  root.addEventListener("change", update);
  root.addEventListener("click", click);
  document.addEventListener("worldcompiler:localechange", update);
  update();
  return () => {
    root.removeEventListener("input", update);
    root.removeEventListener("change", update);
    root.removeEventListener("click", click);
    document.removeEventListener("worldcompiler:localechange", update);
  };
}
