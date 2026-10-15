import { diffLines, diffWordsWithSpace } from "diff";
import { say, downloadBlob } from "../workbench/browser";
export function compareTexts(
  before: string,
  after: string,
  mode: string,
  ignoreCase: boolean,
  trim: boolean,
) {
  if (before.length > 50000 || after.length > 50000)
    throw new Error("Input too large");
  const normalize = (value: string) => {
    let result = value.replace(/\r\n?/gu, "\n");
    if (trim)
      result = result
        .split("\n")
        .map((line) => line.trim())
        .join("\n");
    return ignoreCase ? result.toLocaleLowerCase() : result;
  };
  const options = { timeout: 1000, maxEditLength: 3000 };
  const result =
    mode === "words"
      ? diffWordsWithSpace(normalize(before), normalize(after), options)
      : diffLines(normalize(before), normalize(after), options);
  if (!result) throw new Error("Comparison budget exceeded");
  return result;
}
export function mount(root: HTMLElement): () => void {
  const get = <T extends HTMLElement = HTMLInputElement>(name: string) =>
    root.querySelector<T>(`[data-${name}]`)!;
  const before = get<HTMLTextAreaElement>("diff-before"),
    after = get<HTMLTextAreaElement>("diff-after"),
    left = get("diff-left"),
    right = get("diff-right"),
    error = get("tool-error"),
    status = get("tool-status");
  let report = "",
    changes: HTMLElement[] = [],
    position = -1;
  const controls = (disabled: boolean) =>
    ["diff-download", "diff-prev", "diff-next"].forEach(
      (name) => (get<HTMLButtonElement>(name).disabled = disabled),
    );
  const invalidate = () => {
    report = "";
    changes = [];
    position = -1;
    left.replaceChildren();
    right.replaceChildren();
    controls(true);
    status.textContent = "";
    error.hidden = true;
  };
  const compare = () => {
    invalidate();
    try {
      const mode = get<HTMLSelectElement>("diff-mode").value;
      const parts = compareTexts(
        before.value,
        after.value,
        mode,
        get<HTMLInputElement>("diff-case").checked,
        get<HTMLInputElement>("diff-space").checked,
      );
      let added = 0,
        removed = 0;
      for (const part of parts) {
        if (part.added) added += part.count;
        if (part.removed) removed += part.count;
        report +=
          (part.added ? "+ " : part.removed ? "- " : "  ") + part.value + "\n";
        const make = (side: HTMLElement) => {
          const el = document.createElement("span");
          el.className =
            "diff-part" +
            (part.added ? " diff-add" : part.removed ? " diff-remove" : "");
          el.textContent = part.value;
          if (mode === "words") el.style.display = "inline";
          if (part.added || part.removed) {
            el.tabIndex = -1;
            changes.push(el);
          }
          side.append(el);
        };
        if (!part.added) make(left);
        if (!part.removed) make(right);
      }
      get<HTMLButtonElement>("diff-download").disabled = false;
      get<HTMLButtonElement>("diff-next").disabled = changes.length === 0;
      get<HTMLButtonElement>("diff-prev").disabled = changes.length === 0;
      status.textContent =
        say(["新增", "Added", "Hinzugefügt"]) +
        " " +
        added +
        " · " +
        say(["删除", "Removed", "Entfernt"]) +
        " " +
        removed +
        " · " +
        (mode === "words"
          ? say(["词元", "tokens", "Token"])
          : say(["行", "lines", "Zeilen"]));
    } catch {
      error.hidden = false;
      error.textContent = say([
        "输入过大或差异过多，请缩小比较范围（每侧最多 50,000 字符）。",
        "Input too large or too different. Compare a smaller section (50,000 characters per side).",
        "Eingabe zu groß oder zu verschieden. Einen kleineren Abschnitt vergleichen (50.000 Zeichen pro Seite).",
      ]);
    }
  };
  const click = (event: Event) => {
    const button = (event.target as Element).closest("button");
    if (!button) return;
    if (button.hasAttribute("data-diff-sample")) {
      before.value = "World Compiler\nTools for everyone.\nData stays local.";
      after.value =
        "World Compiler\nUseful tools for everyone.\nYour data stays local.";
      compare();
    }
    if (button.hasAttribute("data-diff-swap")) {
      [before.value, after.value] = [after.value, before.value];
      compare();
    }
    if (button.hasAttribute("data-diff-run")) compare();
    if (button.hasAttribute("data-diff-download"))
      downloadBlob(
        new Blob([report], { type: "text/plain;charset=utf-8" }),
        "world-compiler-diff.txt",
      );
    if (
      (button.hasAttribute("data-diff-next") ||
        button.hasAttribute("data-diff-prev")) &&
      changes.length
    ) {
      position =
        (position +
          (button.hasAttribute("data-diff-next") ? 1 : -1) +
          changes.length) %
        changes.length;
      changes[position].scrollIntoView({
        block: "center",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
      changes[position].focus({ preventScroll: true });
    }
  };
  const onLocale = () => {
    if (report) compare();
    else if (!error.hidden) {
      compare();
    }
  };
  root.addEventListener("input", invalidate);
  root.addEventListener("change", invalidate);
  root.addEventListener("click", click);
  document.addEventListener("worldcompiler:localechange", onLocale);
  return () => {
    root.removeEventListener("input", invalidate);
    root.removeEventListener("change", invalidate);
    root.removeEventListener("click", click);
    document.removeEventListener("worldcompiler:localechange", onLocale);
  };
}
