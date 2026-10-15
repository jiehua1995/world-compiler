import { say, errorCopy, downloadBlob } from "../workbench/browser";
import { parseJsonDocument } from "./core";
export function mount(root: HTMLElement): () => void {
  const get = <T extends HTMLElement = HTMLInputElement>(name: string) =>
    root.querySelector<T>(`[data-${name}]`)!;
  const input = get<HTMLTextAreaElement>("json-input"),
    output = get("json-output"),
    error = get("tool-error"),
    status = get("tool-status"),
    tree = get("json-tree"),
    file = get<HTMLInputElement>("json-file");
  let result = "",
    loadId = 0,
    lastError = "";
  const controls = (disabled: boolean) => {
    get<HTMLButtonElement>("json-download").disabled = disabled;
    get<HTMLButtonElement>("json-copy").disabled = disabled;
  };
  const invalidate = () => {
    ++loadId;
    result = "";
    output.textContent = "";
    tree.replaceChildren();
    controls(true);
    status.textContent = "";
  };
  const run = () => {
    invalidate();
    lastError = "";
    try {
      const value: unknown = parseJsonDocument(input.value);
      result = JSON.stringify(
        value,
        null,
        Number(get<HTMLSelectElement>("json-indent").value),
      );
      output.textContent = result;
      error.hidden = true;
      controls(false);
      let count = 0;
      const node = (
        value: unknown,
        key: string,
        depth: number,
      ): HTMLElement => {
        count++;
        if (value !== null && typeof value === "object") {
          const details = document.createElement("details"),
            summary = document.createElement("summary");
          const entries = Object.entries(value);
          summary.textContent =
            key +
            " " +
            (Array.isArray(value)
              ? "[" + entries.length + "]"
              : "{" + entries.length + "}");
          details.append(summary);
          details.open = depth === 0;
          if (depth < 8)
            for (const [childKey, child] of entries) {
              if (count >= 300) break;
              details.append(node(child, childKey, depth + 1));
            }
          else {
            const text = document.createElement("p");
            text.textContent = "…";
            details.append(text);
          }
          return details;
        }
        const p = document.createElement("p");
        p.textContent = key + ": " + JSON.stringify(value);
        return p;
      };
      tree.append(node(value, "JSON", 0));
      status.textContent = say(["有效 JSON", "Valid JSON", "Gültiges JSON"]);
    } catch (problem) {
      lastError = problem instanceof Error ? problem.message : "";
      error.hidden = false;
      error.textContent = say(errorCopy) + " " + lastError;
      controls(true);
    }
  };
  const click = async (event: Event) => {
    const el = (event.target as Element).closest("button");
    if (!el) return;
    if (el.hasAttribute("data-json-sample")) {
      input.value = JSON.stringify(
        {
          project: "World Compiler",
          local: true,
          languages: ["中文", "English", "Deutsch"],
          tools: 10,
        },
        null,
        2,
      );
      run();
    }
    if (el.hasAttribute("data-json-run")) run();
    if (el.hasAttribute("data-json-download"))
      downloadBlob(
        new Blob([result], { type: "application/json" }),
        "world-compiler.json",
      );
    if (el.hasAttribute("data-json-copy"))
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
  const read = async () => {
    invalidate();
    const id = loadId;
    try {
      const selected = file.files?.[0];
      if (!selected) return;
      if (selected.size > 1000000) throw new Error("File > 1 MB");
      const value = await selected.text();
      if (id !== loadId) return;
      input.value = value;
      run();
    } catch {
      if (id === loadId) {
        error.hidden = false;
        lastError = "";
        error.textContent = say(errorCopy);
      }
    }
  };
  const localeChange = () => {
    if (!error.hidden) error.textContent = say(errorCopy) + " " + lastError;
    status.textContent = "";
  };
  input.addEventListener("input", invalidate);
  root.addEventListener("click", click);
  file.addEventListener("change", read);
  document.addEventListener("worldcompiler:localechange", localeChange);
  return () => {
    ++loadId;
    input.removeEventListener("input", invalidate);
    root.removeEventListener("click", click);
    file.removeEventListener("change", read);
    document.removeEventListener("worldcompiler:localechange", localeChange);
  };
}
