import { dictionary } from "../../i18n/dictionaries";
import { locale, say, downloadBlob } from "../workbench/browser";
import {
  evaluateContrast,
  analyzePalette,
  parseHexColor,
  renderPaletteReportHtml,
  suggestForeground,
  toHex,
} from "./contrast";

export function mountContrastLens(
  root: HTMLElement,
  doc: Document = document,
): { destroy: () => void } {
  const field = (name: string) =>
    root.querySelector<HTMLInputElement>(`[data-color-hex="${name}"]`)!;
  const preview = root.querySelector<HTMLElement>("[data-contrast-preview]")!;
  const ratio = root.querySelector<HTMLElement>("[data-contrast-ratio]")!;
  const error = root.querySelector<HTMLElement>("[data-contrast-error]")!;
  const report = root.querySelector<HTMLButtonElement>(
    "[data-contrast-download]",
  )!;
  const tokenList = root.querySelector<HTMLElement>("[data-token-list]")!;
  const pairList = root.querySelector<HTMLElement>("[data-palette-results]")!;
  const paletteError = root.querySelector<HTMLElement>("[data-palette-error]")!;
  const paletteCount = root.querySelector<HTMLElement>("[data-palette-count]")!;
  const paletteSummary = root.querySelector<HTMLElement>("[data-palette-summary]")!;
  const tokenTemplate = root.querySelector<HTMLTemplateElement>("[data-token-template]")!;
  let nextTokenId = tokenList.querySelectorAll("[data-palette-token]").length;
  const paletteTokens = () => Array.from(tokenList.querySelectorAll<HTMLElement>("[data-palette-token]"), (row) => ({
    id: row.dataset.tokenId!,
    name: row.querySelector<HTMLInputElement>("[data-token-name]")!.value.trim(),
    hex: row.querySelector<HTMLInputElement>("[data-token-hex]")!.value,
  }));
  const renderPalette = () => {
    const rows = Array.from(tokenList.querySelectorAll<HTMLElement>("[data-palette-token]"));
    const tokens = paletteTokens();
    const add = root.querySelector<HTMLButtonElement>("[data-token-add]")!;
    const exportButtons = root.querySelectorAll<HTMLButtonElement>("[data-palette-export]");
    paletteCount.textContent = say([
      `${tokens.length} 个颜色 · ${tokens.length * (tokens.length - 1) / 2} 组配对`,
      `${tokens.length} colors · ${tokens.length * (tokens.length - 1) / 2} pairs`,
      `${tokens.length} Farben · ${tokens.length * (tokens.length - 1) / 2} Paare`,
    ]);
    add.disabled = tokens.length >= 12;
    rows.forEach((row) => row.querySelector<HTMLButtonElement>("[data-token-remove]")!.disabled = tokens.length <= 2);
    const valid = tokens.length >= 2 && tokens.length <= 12 && tokens.every((token) => token.name && parseHexColor(token.hex));
    rows.forEach((row) => {
      const name = row.querySelector<HTMLInputElement>("[data-token-name]")!;
      const hex = row.querySelector<HTMLInputElement>("[data-token-hex]")!;
      name.setAttribute("aria-invalid", String(!name.value.trim()));
      hex.setAttribute("aria-invalid", String(!parseHexColor(hex.value)));
      if (parseHexColor(hex.value)) row.querySelector<HTMLInputElement>("[data-token-picker]")!.value = toHex(parseHexColor(hex.value)!);
    });
    paletteError.hidden = valid;
    exportButtons.forEach((button) => button.disabled = !valid);
    if (!valid) {
      pairList.replaceChildren();
      paletteSummary.textContent = "";
      return;
    }
    const pairs = analyzePalette(tokens);
    const failures = pairs.filter((pair) => !pair.normalAA).length;
    paletteSummary.textContent = say([
      `${pairs.length} 组配对 · ${failures} 组未通过普通文字 AA`,
      `${pairs.length} pairs · ${failures} fail normal-text AA`,
      `${pairs.length} Paare · ${failures} verfehlen AA für normalen Text`,
    ]);
    pairList.replaceChildren(...pairs.map((pair) => {
      const card = doc.createElement("article");
      card.className = "contrast-pair";
      card.dataset.palettePair = "";
      const heading = doc.createElement("h3");
      heading.textContent = `${pair.firstName} / ${pair.secondName}`;
      const ratioText = doc.createElement("strong");
      ratioText.textContent = `${pair.ratio}:1`;
      const top = doc.createElement("header");
      top.append(heading, ratioText);
      const sample = doc.createElement("div");
      sample.className = "contrast-pair-sample";
      sample.style.color = pair.firstHex;
      sample.style.backgroundColor = pair.secondHex;
      const sampleText = doc.createElement("span");
      sampleText.textContent = "Aa 123 · 世界 2026";
      const sampleIcon = doc.createElement("span");
      sampleIcon.setAttribute("aria-hidden", "true");
      sampleIcon.textContent = "◆";
      const sampleButton = doc.createElement("button");
      sampleButton.type = "button";
      sampleButton.textContent = say(["控件", "Control", "Steuerelement"]);
      sample.append(sampleText, sampleIcon, sampleButton);
      const statuses = doc.createElement("ul");
      statuses.className = "contrast-pair-results";
      const checks = [
        ["normalAA", ["普通文字 AA · 4.5:1", "Normal text AA · 4.5:1", "Normaler Text AA · 4,5:1"], pair.normalAA],
        ["normalAAA", ["普通文字 AAA · 7:1", "Normal text AAA · 7:1", "Normaler Text AAA · 7:1"], pair.normalAAA],
        ["largeAA", ["大号文字 AA · 3:1", "Large text AA · 3:1", "Großer Text AA · 3:1"], pair.largeAA],
        ["largeAAA", ["大号文字 AAA · 4.5:1", "Large text AAA · 4.5:1", "Großer Text AAA · 4,5:1"], pair.largeAAA],
        ["nonTextAA", ["图标与控件 · 3:1", "Icons & controls · 3:1", "Symbole & Steuerelemente · 3:1"], pair.nonTextAA],
      ] as const;
      checks.forEach(([key, label, passed]) => {
        const item = doc.createElement("li");
        item.dataset.paletteResult = key;
        item.dataset.pass = String(passed);
        item.textContent = `${say(label)}: ${dictionary(locale())[passed ? "contrast.pass" : "contrast.fail"]}`;
        statuses.append(item);
      });
      card.append(top, sample, statuses);
      if (!pair.normalAA) {
        const suggestions = doc.createElement("div");
        suggestions.className = "contrast-suggestions";
        suggestions.append(doc.createTextNode(say(["达到 AA 的建议：", "Suggested AA fixes:", "Vorschläge für AA:"])));
        [[pair.firstId, pair.firstName, pair.firstSuggestion], [pair.secondId, pair.secondName, pair.secondSuggestion]].forEach(([id, name, hex]) => {
          if (!id || !hex) return;
          const button = doc.createElement("button");
          button.type = "button";
          button.dataset.paletteSuggest = id;
          button.textContent = say([`调整 ${name} 为 ${hex}`, `Set ${name} to ${hex}`, `${name} auf ${hex} setzen`]);
          suggestions.append(button);
        });
        card.append(suggestions);
      }
      return card;
    }));
  };
  const update = () => {
    const colors = ["foreground", "background"].map((name) => {
      const input = field(name),
        color = parseHexColor(input.value);
      input.setAttribute("aria-invalid", String(!color));
      if (color)
        root.querySelector<HTMLInputElement>(
          `[data-color-picker="${name}"]`,
        )!.value = toHex(color);
      return color;
    });
    const valid = colors.every(Boolean);
    error.hidden = valid;
    report.disabled = !valid;
    if (!valid) {
      ratio.textContent = "—";
      root
        .querySelectorAll("[data-result]")
        .forEach((el) => (el.textContent = "—"));
      renderPalette();
      return;
    }
    const [fg, bg] = colors;
    preview.style.color = toHex(fg!);
    preview.style.backgroundColor = toHex(bg!);
    preview.style.fontSize =
      root.querySelector<HTMLInputElement>("[data-font-size]")!.value + "px";
    preview.style.fontWeight =
      root.querySelector<HTMLSelectElement>("[data-font-weight]")!.value;
    root.querySelector("[data-preview-heading]")!.textContent =
      root.querySelector<HTMLInputElement>("[data-preview-text]")!.value;
    const result = evaluateContrast(fg!, bg!);
    ratio.textContent = result.ratio + ":1";
    root
      .querySelectorAll<HTMLElement>("[data-result]")
      .forEach(
        (el) =>
          (el.textContent =
            dictionary(locale())[
              result[el.dataset.result as "normalAA"]
                ? "contrast.pass"
                : "contrast.fail"
            ]),
      );
    renderPalette();
  };
  const onInput = (event: Event) => {
    const el = event.target as HTMLInputElement;
    if (el.dataset.colorPicker) field(el.dataset.colorPicker).value = el.value;
    if (el.dataset.tokenPicker !== undefined) el.closest<HTMLElement>("[data-palette-token]")!.querySelector<HTMLInputElement>("[data-token-hex]")!.value = el.value.toUpperCase();
    update();
  };
  const onClick = (event: Event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      "button",
    );
    if (!button) return;
    let focusTokenId: string | undefined;
    if (button.hasAttribute("data-token-add") && tokenList.querySelectorAll("[data-palette-token]").length < 12) {
      const row = tokenTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement;
      row.dataset.tokenId = String(nextTokenId++);
      row.querySelector<HTMLInputElement>("[data-token-name]")!.value = say([`颜色 ${nextTokenId - 1}`, `Color ${nextTokenId - 1}`, `Farbe ${nextTokenId - 1}`]);
      const hex = ["#FCA104", "#2F6DB3", "#E56C57", "#5200A6", "#CDB742", "#45A6B2"][Number(row.dataset.tokenId) % 6];
      row.querySelector<HTMLInputElement>("[data-token-picker]")!.value = hex;
      row.querySelector<HTMLInputElement>("[data-token-hex]")!.value = hex;
      tokenList.append(row);
    }
    if (button.hasAttribute("data-token-remove") && tokenList.querySelectorAll("[data-palette-token]").length > 2) button.closest("[data-palette-token]")!.remove();
    if (button.dataset.paletteSuggest) {
      focusTokenId = button.dataset.paletteSuggest;
      const row = Array.from(tokenList.querySelectorAll<HTMLElement>("[data-palette-token]")).find((item) => item.dataset.tokenId === button.dataset.paletteSuggest);
      const hex = button.textContent?.match(/#[\da-f]{6}/i)?.[0];
      if (row && hex) {
        row.querySelector<HTMLInputElement>("[data-token-hex]")!.value = hex;
        row.querySelector<HTMLInputElement>("[data-token-picker]")!.value = hex;
      }
    }
    if (button.dataset.paletteExport) {
      const tokens = paletteTokens();
      const pairs = analyzePalette(tokens);
      const blob = button.dataset.paletteExport === "html"
        ? new Blob([renderPaletteReportHtml(tokens, locale() as "zh-CN" | "en" | "de")], { type: "text/html;charset=utf-8" })
        : new Blob([JSON.stringify({ criteria: { normalAA: 4.5, normalAAA: 7, largeAA: 3, largeAAA: 4.5, nonTextAA: 3 }, tokens, pairs }, null, 2)], { type: "application/json" });
      downloadBlob(blob, `world-compiler-contrast-palette.${button.dataset.paletteExport}`);
    }
    if (button.hasAttribute("data-swap"))
      [field("foreground").value, field("background").value] = [
        field("background").value,
        field("foreground").value,
      ];
    if (button.dataset.presetFg) {
      field("foreground").value = button.dataset.presetFg;
      field("background").value = button.dataset.presetBg!;
    }
    if (button.dataset.suggest) {
      const fg = parseHexColor(field("foreground").value),
        bg = parseHexColor(field("background").value);
      if (fg && bg) {
        const suggestion = suggestForeground(
          fg,
          bg,
          Number(button.dataset.suggest),
        );
        if (suggestion) field("foreground").value = toHex(suggestion);
        root.querySelector("[data-suggestion-status]")!.textContent = suggestion
          ? say([
              "已应用颜色建议",
              "Color suggestion applied",
              "Farbvorschlag angewendet",
            ])
          : say([
              "此背景无法达到目标，请调整背景。",
              "This background cannot meet the target. Adjust it first.",
              "Mit diesem Hintergrund ist das Ziel nicht erreichbar. Hintergrund anpassen.",
            ]);
      }
    }
    if (button === report)
      downloadBlob(
        new Blob(
          [
            JSON.stringify(
              {
                foreground: field("foreground").value,
                background: field("background").value,
                ...evaluateContrast(
                  parseHexColor(field("foreground").value)!,
                  parseHexColor(field("background").value)!,
                ),
              },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
        "world-compiler-contrast.json",
      );
    update();
    if (focusTokenId) Array.from(tokenList.querySelectorAll<HTMLElement>("[data-palette-token]"))
      .find((row) => row.dataset.tokenId === focusTokenId)?.querySelector<HTMLInputElement>("[data-token-hex]")?.focus();
  };
  const onChange = (event: Event) => {
    if ((event.target as Element).closest("[data-token-list]")) return;
    update();
  };
  root.addEventListener("input", onInput);
  root.addEventListener("change", onChange);
  root.addEventListener("click", onClick);
  doc.addEventListener("worldcompiler:localechange", update);
  update();
  return {
    destroy() {
      root.removeEventListener("input", onInput);
      root.removeEventListener("change", onChange);
      root.removeEventListener("click", onClick);
      doc.removeEventListener("worldcompiler:localechange", update);
    },
  };
}
