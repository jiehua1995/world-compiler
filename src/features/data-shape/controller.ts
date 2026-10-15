import { dictionary } from "../../i18n/dictionaries";
import { resolveLocale } from "../../i18n/locale";
import { downloadBlob, say } from "../workbench/browser";
import {
  DelimitedTextError,
  MAX_FILE_BYTES,
  parseDelimitedText,
  serializeCsv,
} from "./csv";
import { shapeRows, serializeTsv, escapeSpreadsheetFormulas } from "./shape";

export function mountDataShaper(
  root: HTMLElement,
  doc: Document = document,
  _win: Window = window,
): { destroy: () => void } {
  const get = <T extends HTMLElement = HTMLInputElement>(name: string) =>
    root.querySelector<T>(`[data-${name}]`)!;
  const input = get<HTMLInputElement>("data-file"),
    delimiter = get<HTMLSelectElement>("delimiter"),
    status = get("data-status"),
    error = get("data-error");
  const clean = get<HTMLButtonElement>("clean"),
    download = get<HTMLButtonElement>("download"),
    table = get("data-table"),
    preview = get("data-preview");
  let source = "",
    hasSource = false,
    rows: string[][] = [],
    cleaned: string[][] | null = null,
    loadId = 0;
  const copy = () => dictionary(resolveLocale(doc.documentElement.lang, []));
  const format = get<HTMLSelectElement>("data-format");
  const updateDownloadLabel = () => {
    download.textContent =
      format.value === "CSV"
        ? copy()["data.download"]
        : say([
            "下载整理后的 " + format.value,
            "Download cleaned " + format.value,
            "Bereinigte " + format.value + " herunterladen",
          ]);
  };
  const render = (value: string[][]) => {
    table.replaceChildren(
      ...value.slice(0, 8).map((row, index) => {
        const tr = doc.createElement("tr");
        for (const cell of row.slice(0, 30)) {
          const el = doc.createElement(index === 0 ? "th" : "td");
          if (index === 0) el.setAttribute("scope", "col");
          el.textContent = cell;
          tr.append(el);
        }
        return tr;
      }),
    );
    get("source-count").textContent = String(rows.length);
    get("result-count").textContent = String(value.length);
    get("empty-count").textContent = String(
      value.reduce(
        (total, row) => total + row.filter((cell) => !cell.trim()).length,
        0,
      ),
    );
    get("ragged").textContent = rows.some(
      (row) => row.length !== rows[0]?.length,
    )
      ? say([
          "检测到各行列数不一致，请检查输入。",
          "Rows have inconsistent column counts. Check the input.",
          "Zeilen haben unterschiedliche Spaltenzahlen. Eingabe prüfen.",
        ])
      : "";
  };
  const clear = () => {
    rows = [];
    cleaned = null;
    clean.disabled = true;
    download.disabled = true;
    preview.hidden = true;
    table.replaceChildren();
    render([]);
  };
  const showError = (
    key:
      | "data.error.tooLarge"
      | "data.error.tooComplex"
      | "data.error.unsupported"
      | "data.error.invalid",
  ) => {
    clear();
    source = "";
    hasSource = false;
    status.textContent = "";
    error.hidden = false;
    error.dataset.messageKey = key;
    error.textContent = copy()[key];
  };
  const parse = () => {
    if (!hasSource) return;
    try {
      rows = parseDelimitedText(source, delimiter.value === "tab" ? "\t" : ",");
      cleaned = null;
      render(rows);
      preview.hidden = false;
      clean.disabled = false;
      download.disabled = true;
      error.hidden = true;
      status.textContent = copy()["data.status.ready"];
    } catch (problem) {
      showError(
        problem instanceof DelimitedTextError && problem.code === "too-complex"
          ? "data.error.tooComplex"
          : "data.error.invalid",
      );
    }
  };
  const onFile = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const request = ++loadId;
    source = "";
    hasSource = false;
    clear();
    error.hidden = true;
    if (file.size > MAX_FILE_BYTES) {
      showError("data.error.tooLarge");
      return;
    }
    if (!/\.(csv|tsv)$/iu.test(file.name)) {
      showError("data.error.unsupported");
      return;
    }
    delimiter.value = /\.tsv$/iu.test(file.name) ? "tab" : ",";
    try {
      const text = await file.text();
      if (request !== loadId) return;
      source = text;
      hasSource = true;
      parse();
    } catch {
      if (request === loadId) showError("data.error.invalid");
    }
  };
  const onClean = () => {
    try {
      cleaned = shapeRows(rows, {
        columns: get<HTMLInputElement>("keep-columns").value,
        names: get<HTMLInputElement>("column-names").value,
        sortColumn: Number(get<HTMLInputElement>("sort-column").value),
        direction: get<HTMLSelectElement>("sort-order").value as
          "none" | "asc" | "desc",
        deduplicate: get<HTMLInputElement>("deduplicate").checked,
      });
      render(cleaned);
      download.disabled = false;
      error.hidden = true;
    } catch {
      delete error.dataset.messageKey;
      error.hidden = false;
      error.textContent = say([
        "请检查保留列、排序列和新列名数量。",
        "Check kept columns, sort column and the number of new names.",
        "Spaltenauswahl, Sortierspalte und Anzahl neuer Namen prüfen.",
      ]);
    }
  };
  const onClick = (event: Event) => {
    const button = (event.target as Element).closest("button");
    if (!button) return;
    if (
      button.hasAttribute("data-data-read") ||
      button.hasAttribute("data-data-sample")
    ) {
      ++loadId;
      if (button.hasAttribute("data-data-sample")) {
        get<HTMLTextAreaElement>("data-paste").value =
          "name,city,visits\n Ada ,Berlin,12\nLin,München,3\n Ada ,Berlin,12\n , , ";
        delimiter.value = ",";
      }
      source = get<HTMLTextAreaElement>("data-paste").value;
      hasSource = true;
      parse();
    }
    if (button === clean) onClean();
    if (button === download && cleaned) {
      const value = get<HTMLInputElement>("formula-safe").checked
        ? escapeSpreadsheetFormulas(cleaned)
        : cleaned;
      const format = get<HTMLSelectElement>("data-format").value;
      downloadBlob(
        new Blob(
          [
            format === "JSON"
              ? JSON.stringify(value, null, 2)
              : format === "TSV"
                ? serializeTsv(value)
                : serializeCsv(value),
          ],
          {
            type:
              format === "JSON"
                ? "application/json"
                : "text/plain;charset=utf-8",
          },
        ),
        "world-compiler-cleaned." + format.toLowerCase(),
      );
    }
  };
  const onLocale = () => {
    updateDownloadLabel();
    if (!error.hidden && error.dataset.messageKey)
      error.textContent =
        copy()[error.dataset.messageKey as "data.error.invalid"];
    else if (!error.hidden)
      error.textContent = say([
        "请检查保留列、排序列和新列名数量。",
        "Check kept columns, sort column and the number of new names.",
        "Spaltenauswahl, Sortierspalte und Anzahl neuer Namen prüfen.",
      ]);
    else
      status.textContent =
        copy()[hasSource ? "data.status.ready" : "data.status.empty"];
    render(cleaned ?? rows);
  };
  const onOptions = (event: Event) => {
    if (
      (event.target as Element).matches(
        "[data-keep-columns],[data-column-names],[data-sort-column],[data-sort-order],[data-deduplicate],[data-data-paste]",
      )
    ) {
      cleaned = null;
      download.disabled = true;
      render(rows);
    }
  };
  input.addEventListener("change", onFile);
  delimiter.addEventListener("change", parse);
  format.addEventListener("change", updateDownloadLabel);
  root.addEventListener("click", onClick);
  root.addEventListener("input", onOptions);
  doc.addEventListener("worldcompiler:localechange", onLocale);
  return {
    destroy() {
      ++loadId;
      input.removeEventListener("change", onFile);
      delimiter.removeEventListener("change", parse);
      format.removeEventListener("change", updateDownloadLabel);
      root.removeEventListener("click", onClick);
      root.removeEventListener("input", onOptions);
      doc.removeEventListener("worldcompiler:localechange", onLocale);
    },
  };
}
