import { dictionary } from '../../i18n/dictionaries';
import type { Locale } from '../../i18n/types';
import { evaluateContrast, parseHexColor } from './contrast';

export function mountContrastLens(root: HTMLElement, doc: Document = document): { destroy: () => void } {
  const preview = root.querySelector<HTMLElement>('[data-contrast-preview]');
  const ratio = root.querySelector<HTMLElement>('[data-contrast-ratio]');
  const error = root.querySelector<HTMLElement>('[data-contrast-error]');
  const resultNodes = [...root.querySelectorAll<HTMLElement>('[data-result]')];
  if (!preview || !ratio || !error || resultNodes.length !== 4) return { destroy() {} };

  const update = () => {
    const colors = (['foreground', 'background'] as const).map((name) => {
      const field = root.querySelector<HTMLInputElement>(`[data-color-hex="${name}"]`)!;
      return { field, color: parseHexColor(field.value) };
    });
    const valid = colors.every(({ color }) => color !== null);
    error.hidden = valid;
    colors.forEach(({ field, color }) => {
      field.setAttribute('aria-invalid', String(!color));
      if (color) root.querySelector<HTMLInputElement>(`[data-color-picker="${field.dataset.colorHex}"]`)!.value = `#${[color.r, color.g, color.b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
    });
    if (!valid) { ratio.textContent = '—'; resultNodes.forEach((node) => { node.textContent = '—'; }); return; }
    const [foreground, background] = colors.map(({ color }) => color!);
    preview.style.color = `rgb(${foreground.r} ${foreground.g} ${foreground.b})`;
    preview.style.backgroundColor = `rgb(${background.r} ${background.g} ${background.b})`;
    const evaluation = evaluateContrast(foreground, background);
    ratio.textContent = `${evaluation.ratio}:1`;
    const copy = dictionary((doc.documentElement.lang || 'zh-CN') as Locale);
    resultNodes.forEach((node) => { node.textContent = evaluation[node.dataset.result as keyof typeof evaluation] ? copy['contrast.pass'] : copy['contrast.fail']; });
  };
  const syncPicker = (event: Event) => {
    const picker = event.currentTarget as HTMLInputElement;
    root.querySelector<HTMLInputElement>(`[data-color-hex="${picker.dataset.colorPicker}"]`)!.value = picker.value;
    update();
  };
  const onChange = () => update();
  const pickers = [...root.querySelectorAll<HTMLInputElement>('[data-color-picker]')];
  const fields = [...root.querySelectorAll<HTMLInputElement>('[data-color-hex]')];
  pickers.forEach((input) => input.addEventListener('input', syncPicker));
  fields.forEach((input) => input.addEventListener('input', onChange));
  doc.addEventListener('worldcompiler:localechange', update);
  update();
  return { destroy() { pickers.forEach((input) => input.removeEventListener('input', syncPicker)); fields.forEach((input) => input.removeEventListener('input', onChange)); doc.removeEventListener('worldcompiler:localechange', update); } };
}
