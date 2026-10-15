import { dictionary } from "../../i18n/dictionaries";
import { locale, say, downloadBlob } from "../workbench/browser";
import {
  evaluateContrast,
  parseHexColor,
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
  };
  const onInput = (event: Event) => {
    const el = event.target as HTMLInputElement;
    if (el.dataset.colorPicker) field(el.dataset.colorPicker).value = el.value;
    update();
  };
  const onClick = (event: Event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      "button",
    );
    if (!button) return;
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
  };
  root.addEventListener("input", onInput);
  root.addEventListener("change", update);
  root.addEventListener("click", onClick);
  doc.addEventListener("worldcompiler:localechange", update);
  update();
  return {
    destroy() {
      root.removeEventListener("input", onInput);
      root.removeEventListener("change", update);
      root.removeEventListener("click", onClick);
      doc.removeEventListener("worldcompiler:localechange", update);
    },
  };
}
