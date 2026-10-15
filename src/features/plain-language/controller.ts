import { dictionary } from "../../i18n/dictionaries";
import { resolveLocale } from "../../i18n/locale";
import type { Locale } from "../../i18n/types";
import { downloadBlob, say } from "../workbench/browser";
import { analyzePlainLanguage } from "./analyze";

export function mountPlainLanguageMeter(
  root: HTMLElement,
  doc: Document = document,
): { destroy: () => void } {
  const text = root.querySelector<HTMLTextAreaElement>("[data-analysis-text]")!;
  const language = root.querySelector<HTMLSelectElement>(
    "[data-analysis-locale]",
  )!;
  let manuallySelected = false;
  let previous: string | null = null;
  const undo = root.querySelector<HTMLButtonElement>("[data-plain-undo]")!;
  const beforePanel = root.querySelector<HTMLElement>(
    "[data-plain-before-panel]",
  )!;
  const clearUndo = () => {
    previous = null;
    undo.disabled = true;
    beforePanel.hidden = true;
  };
  language.value = resolveLocale(doc.documentElement.lang, []);
  const update = () => {
    const result = analyzePlainLanguage(text.value, language.value as Locale);
    for (const name of [
      "characterCount",
      "wordCount",
      "sentenceCount",
      "averageSentenceLength",
    ] as const)
      root.querySelector(`[data-stat="${name}"]`)!.textContent = String(
        result[name],
      );
    root.querySelector('[data-stat="score"]')!.textContent =
      result.score === null
        ? dictionary(resolveLocale(doc.documentElement.lang, []))[
            "plain.scoreUnavailable"
          ]
        : String(result.score);
    root.querySelector("[data-paragraphs]")!.textContent = String(
      text.value.split(/\n\s*\n/u).filter((p) => p.trim()).length,
    );
    root.querySelector("[data-reading]")!.textContent = result.wordCount
      ? String(
          Math.max(
            1,
            Math.ceil(
              result.wordCount / (language.value === "zh-CN" ? 300 : 200),
            ),
          ),
        )
      : "0";
    const marked = root.querySelector("[data-marked-text]")!;
    marked.replaceChildren();
    let cursor = 0;
    const list = root.querySelector("[data-long-list]")!;
    list.replaceChildren();
    for (const sentence of result.longSentences) {
      const start = text.value.indexOf(sentence.text, cursor);
      if (start >= 0) {
        marked.append(doc.createTextNode(text.value.slice(cursor, start)));
        const mark = doc.createElement("mark");
        mark.textContent = sentence.text;
        marked.append(mark);
        cursor = start + sentence.text.length;
      }
      const li = doc.createElement("li"),
        button = doc.createElement("button");
      button.type = "button";
      button.textContent = sentence.text + " (" + sentence.wordCount + ")";
      button.onclick = () => {
        const offset = text.value.indexOf(sentence.text);
        text.focus();
        text.setSelectionRange(offset, offset + sentence.text.length);
      };
      li.append(button);
      list.append(li);
    }
    marked.append(doc.createTextNode(text.value.slice(cursor)));
    (root.querySelector("[data-long-empty]") as HTMLElement).hidden =
      result.longSentences.length > 0;
    const frequencies = new Map<string, number>();
    for (const part of new Intl.Segmenter(language.value, {
      granularity: "word",
    }).segment(text.value)) {
      if (part.isWordLike) {
        const word = part.segment.toLocaleLowerCase(language.value);
        frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
      }
    }
    root.querySelector("[data-frequent]")!.textContent = [...frequencies]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => word + " × " + count)
      .join(" · ");
  };
  const onLanguage = () => {
    manuallySelected = true;
    update();
  };
  const onLocale = () => {
    if (!manuallySelected)
      language.value = resolveLocale(doc.documentElement.lang, []);
    update();
  };
  const onClick = (event: Event) => {
    const el = (event.target as Element).closest("button");
    if (!el) return;
    if (el.hasAttribute("data-plain-clean")) {
      previous = text.value;
      root.querySelector("[data-plain-before]")!.textContent = previous;
      beforePanel.hidden = false;
      undo.disabled = false;
      text.value = text.value
        .split("\n")
        .map((line) => line.trim().replace(/[ \t]+/gu, " "))
        .join("\n")
        .replace(/\n{3,}/gu, "\n\n")
        .trim();
    }
    if (el === undo && previous !== null) {
      text.value = previous;
      clearUndo();
    }
    if (el.hasAttribute("data-plain-reset")) {
      text.value = "";
      clearUndo();
    }
    if (el.hasAttribute("data-plain-sample"))
      text.value = say(
        [
          "清晰的信息，让每个人都能参与。\n\n请先阅读说明，再选择你需要的服务。我们会一步一步帮助你完成申请。",
          "Clear information helps everyone take part.\n\nRead the instructions first. Then choose the service you need. We will help you complete each step.",
          "Klare Informationen helfen allen Menschen.\n\nLies zuerst die Anleitung. Wähle dann den passenden Dienst. Wir helfen dir bei jedem Schritt.",
        ],
        language.value,
      );
    if (el.hasAttribute("data-plain-text"))
      downloadBlob(
        new Blob([text.value], { type: "text/plain;charset=utf-8" }),
        "world-compiler-text.txt",
      );
    if (el.hasAttribute("data-plain-report"))
      downloadBlob(
        new Blob(
          [
            JSON.stringify(
              {
                language: language.value,
                ...analyzePlainLanguage(text.value, language.value as Locale),
              },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
        "world-compiler-reading.json",
      );
    if (el.hasAttribute("data-plain-sample")) clearUndo();
    update();
  };
  const onInput = () => {
    clearUndo();
    update();
  };
  text.addEventListener("input", onInput);
  language.addEventListener("change", onLanguage);
  root.addEventListener("click", onClick);
  doc.addEventListener("worldcompiler:localechange", onLocale);
  update();
  return {
    destroy() {
      text.removeEventListener("input", onInput);
      language.removeEventListener("change", onLanguage);
      root.removeEventListener("click", onClick);
      doc.removeEventListener("worldcompiler:localechange", onLocale);
    },
  };
}
