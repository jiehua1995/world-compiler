import { comparePalettePair, generateHarmony, paletteModes, type Harmony } from './palette';
import type { VisionMode } from './types';
import { transformPixel } from './simulate';
import type { Locale } from '../../i18n/types';

const presets: Record<string, string[]> = {
  brand: ['#FCA104', '#2F6DB3', '#E56C57', '#5200A6', '#CDB742', '#45A6B2'],
  ocean: ['#073B4C', '#118AB2', '#06D6A0', '#83C5BE', '#EDF6F9', '#EF476F'],
  sunset: ['#432371', '#714674', '#A55B6E', '#D4755B', '#FCA104', '#F7D08A'],
  forest: ['#173F35', '#2D6A4F', '#52B788', '#95D5B2', '#D8F3DC', '#DDA15E'],
  accessible: ['#000000', '#FFFFFF', '#0072B2', '#E69F00', '#009E73', '#D55E00'],
};

const locale = (root: HTMLElement): Locale => root.ownerDocument.documentElement.lang === 'de' ? 'de' : root.ownerDocument.documentElement.lang === 'en' ? 'en' : 'zh-CN';
const copy = (element: HTMLElement, active: Locale) => { element.textContent = active === 'en' ? element.dataset.copyEn ?? '' : active === 'de' ? element.dataset.copyDe ?? '' : element.dataset.copyZh ?? ''; };
const hex = (r: number, g: number, b: number) => `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const modeNames: Record<VisionMode, Record<Locale, string>> = {
  original: { 'zh-CN': '原图', en: 'Original', de: 'Original' }, protan: { 'zh-CN': '红色弱', en: 'Protanomaly', de: 'Protanomalie' },
  deutan: { 'zh-CN': '绿色弱', en: 'Deuteranomaly', de: 'Deuteranomalie' }, tritan: { 'zh-CN': '蓝黄色弱', en: 'Tritanomaly', de: 'Tritanomalie' },
  protanopia: { 'zh-CN': '红色盲', en: 'Protanopia', de: 'Protanopie' }, deuteranopia: { 'zh-CN': '绿色盲', en: 'Deuteranopia', de: 'Deuteranopie' },
  tritanopia: { 'zh-CN': '蓝色盲', en: 'Tritanopia', de: 'Tritanopie' }, achromatopsia: { 'zh-CN': '全色盲', en: 'Achromatopsia', de: 'Achromatopsie' },
  'blue-cone-monochromacy': { 'zh-CN': '蓝锥单色视', en: 'Blue-cone monochromacy', de: 'Blauzapfen-Monochromasie' },
};

export function mountPaletteWorkbench(root: HTMLElement): { destroy(): void } {
  const panel = root.querySelector<HTMLElement>('[data-palette-workbench]');
  if (!panel) throw new Error('Palette workbench markup is missing.');
  const count = panel.querySelector<HTMLInputElement>('[data-palette-count]')!;
  const base = panel.querySelector<HTMLInputElement>('[data-palette-base]')!;
  const harmony = panel.querySelector<HTMLSelectElement>('[data-palette-harmony]')!;
  const preset = panel.querySelector<HTMLSelectElement>('[data-palette-preset]')!;
  const swatches = panel.querySelector<HTMLElement>('[data-palette-swatches]')!;
  const previews = panel.querySelector<HTMLElement>('[data-palette-previews]')!;
  const fgSelect = panel.querySelector<HTMLSelectElement>('[data-palette-foreground]')!;
  const bgSelect = panel.querySelector<HTMLSelectElement>('[data-palette-background]')!;
  const results = panel.querySelector<HTMLElement>('[data-palette-contrast-results]')!;
  const status = panel.querySelector<HTMLElement>('[data-palette-status]')!;
  let colors = [...presets.brand];
  let sampleMode = false;
  const text = (zh: string, en: string, de: string) => { status.textContent = locale(root) === 'en' ? en : locale(root) === 'de' ? de : zh; };
  const validHex = (value: string) => /^#[\da-f]{6}$/i.test(value);
  const render = () => {
    swatches.replaceChildren();
    colors.forEach((color, index) => {
      const item = document.createElement('div'); item.className = 'palette-swatch'; item.dataset.paletteSwatch = '';
      const chip = document.createElement('input'); chip.type = 'color'; chip.value = color; chip.setAttribute('aria-label', locale(root) === 'de' ? `Farbe ${index + 1}` : locale(root) === 'en' ? `Color ${index + 1}` : `颜色 ${index + 1}`);
      const value = document.createElement('input'); value.type = 'text'; value.value = color; value.maxLength = 7; value.dataset.paletteHex = ''; value.setAttribute('aria-label', locale(root) === 'de' ? `HEX-Farbe ${index + 1}` : locale(root) === 'en' ? `HEX color ${index + 1}` : `HEX 色值 ${index + 1}`); value.autocomplete = 'off';
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', locale(root) === 'de' ? `Farbe ${index + 1} entfernen` : locale(root) === 'en' ? `Remove color ${index + 1}` : `删除颜色 ${index + 1}`); remove.disabled = colors.length <= 2;
      chip.addEventListener('input', () => { colors[index] = chip.value.toUpperCase(); value.value = colors[index]; renderPreview(); });
      value.addEventListener('change', () => { if (validHex(value.value)) { colors[index] = value.value.toUpperCase(); chip.value = colors[index]; renderPreview(); } else value.value = colors[index]; });
      remove.addEventListener('click', () => { colors.splice(index, 1); count.value = String(colors.length); render(); });
      item.append(chip, value, remove); swatches.append(item);
    });
    for (const select of [fgSelect, bgSelect]) {
      const prior = Number(select.value) || 0; select.replaceChildren(...colors.map((color, index) => { const option = document.createElement('option'); option.value = String(index); option.textContent = `${index + 1} · ${color}`; return option; })); select.value = String(Math.min(prior, colors.length - 1));
    }
    renderPreview();
  };
  const renderPreview = () => {
    previews.replaceChildren();
    const activeLocale = locale(root);
    const original = document.createElement('div'); original.className = 'palette-preview-row'; original.dataset.palettePreviewRow = 'original';
    const title = document.createElement('h4'); title.textContent = modeNames.original[activeLocale]; original.append(title);
    const chips = document.createElement('div'); chips.className = 'palette-preview-row__chips'; colors.forEach(color => { const chip = document.createElement('span'); chip.style.backgroundColor = color; chip.title = color; chip.textContent = color; chips.append(chip); }); original.append(chips); previews.append(original);
    const severity = Number(root.querySelector<HTMLInputElement>('[data-severity]')?.value) || 0;
    for (const mode of paletteModes.filter(mode => mode !== 'original')) {
      const row = document.createElement('div'); row.className = 'palette-preview-row'; row.dataset.palettePreviewRow = mode;
      const heading = document.createElement('h4'); heading.textContent = modeNames[mode][activeLocale]; row.append(heading);
      const chipsRow = document.createElement('div'); chipsRow.className = 'palette-preview-row__chips';
      colors.forEach(color => {
        const chip = document.createElement('span'); chip.title = color;
        const rgb = color.match(/[\da-f]{2}/gi)!.map(part => Number.parseInt(part, 16));
        const mapped = transformPixel(rgb[0], rgb[1], rgb[2], 255, mode, ['protan', 'deutan', 'tritan'].includes(mode) ? severity : 100);
        chip.style.backgroundColor = `rgb(${mapped.slice(0, 3).join(',')})`; chip.textContent = color; chipsRow.append(chip);
      });
      row.append(chipsRow); previews.append(row);
    }
    renderContrast();
  };
  const renderContrast = () => {
    const foreground = colors[Number(fgSelect.value) || 0] ?? colors[0]; const background = colors[Number(bgSelect.value) || Math.min(1, colors.length - 1)] ?? colors[1];
    results.replaceChildren();
    const severity = Number(root.querySelector<HTMLInputElement>('[data-severity]')?.value) || 0;
    comparePalettePair(foreground, background, severity).forEach(item => {
      const row = document.createElement('div'); row.dataset.paletteContrastRow = ''; row.className = 'palette-contrast-row';
      const name = document.createElement('span'); name.textContent = modeNames[item.mode][locale(root)];
      const ratio = document.createElement('b'); ratio.textContent = `${item.ratio.toFixed(2)}:1`;
      const pass = document.createElement('span'); pass.textContent = item.normalAA ? 'AA ✓' : 'AA —'; pass.dataset.pass = String(item.normalAA); row.append(name, ratio, pass); results.append(row);
    });
  };
  const setColors = (next: string[]) => { colors = next.slice(0, 12).map(color => color.toUpperCase()); count.value = String(colors.length); render(); };
  const generate = () => { const amount = Number(count.value); if (!Number.isInteger(amount) || amount < 2 || amount > 12) { text('颜色数量需为 2–12。', 'Choose 2–12 colors.', 'Wähle 2–12 Farben.'); count.value = String(colors.length); return; } setColors(generateHarmony(base.value, amount, harmony.value as Harmony)); };
  const usePreset = () => setColors(presets[preset.value]);
  const extract = () => {
    const canvas = root.querySelector<HTMLCanvasElement>('[data-canvas="original"]'); const context = canvas?.getContext('2d'); if (!canvas || !context) return;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data; const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < pixels.length; i += 4) { if (pixels[i + 3] < 128) continue; const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]]; const key = (r >> 4) * 256 + (g >> 4) * 16 + (b >> 4); const bucket = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }; bucket.n++; bucket.r += r; bucket.g += g; bucket.b += b; bins.set(key, bucket); }
    const extracted = [...bins.values()].sort((a, b) => b.n - a.n).slice(0, Number(count.value)).map(p => hex(Math.round(p.r / p.n), Math.round(p.g / p.n), Math.round(p.b / p.n)));
    if (extracted.length >= 2) { setColors(extracted); text('已在本地从图片提取主色。', 'Colors extracted locally from the image.', 'Farben lokal aus dem Bild extrahiert.'); }
  };
  const onSample = () => { sampleMode = true; text('请在上方原图中点击要取样的位置。', 'Click a point in the original image above.', 'Klicke oben auf die Stelle im Originalbild.'); };
  const onCanvasClick = (event: Event) => {
    if (!sampleMode) return; const canvas = event.currentTarget as HTMLCanvasElement; const rect = canvas.getBoundingClientRect(); const x = Math.max(0, Math.min(canvas.width - 1, Math.floor((event as MouseEvent).clientX - rect.left) * canvas.width / rect.width)); const y = Math.max(0, Math.min(canvas.height - 1, Math.floor((event as MouseEvent).clientY - rect.top) * canvas.height / rect.height)); const pixel = canvas.getContext('2d')?.getImageData(x, y, 1, 1).data; if (!pixel) return;
    if (colors.length < Number(count.value)) colors.push(hex(pixel[0], pixel[1], pixel[2])); else colors[colors.length - 1] = hex(pixel[0], pixel[1], pixel[2]); sampleMode = false; render(); text('已从原图取样颜色。', 'Color sampled from the original.', 'Farbe aus dem Original aufgenommen.');
  };
  const download = (blob: Blob, filename: string) => { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0); };
  const onExport = (event: Event) => { const format = (event.currentTarget as HTMLElement).dataset.paletteExport; const content = format === 'css' ? `:root {\n${colors.map((color, index) => `  --color-${index + 1}: ${color};`).join('\n')}\n}\n` : JSON.stringify(colors.map((color, index) => ({ name: `Color ${index + 1}`, hex: color })), null, 2); download(new Blob([content], { type: format === 'css' ? 'text/css' : 'application/json' }), format === 'css' ? 'color-palette.css' : 'color-palette.json'); };
  const onCount = () => { const amount = Math.max(2, Math.min(12, Number(count.value) || 6)); count.value = String(amount); setColors([...colors.slice(0, amount), ...generateHarmony(base.value, amount, harmony.value as Harmony).slice(colors.length, amount)]); };
  const onLocale = () => { panel.querySelectorAll<HTMLElement>('[data-copy-zh][data-copy-en][data-copy-de]').forEach(element => copy(element, locale(root))); panel.querySelectorAll<HTMLOptionElement>('option[data-copy-zh][data-copy-en][data-copy-de]').forEach(element => copy(element, locale(root))); render(); };
  const severityControl = root.querySelector<HTMLInputElement>('[data-severity]');
  const onSeverity = () => renderPreview();
  panel.querySelector('[data-palette-generate]')?.addEventListener('click', generate); panel.querySelector('[data-palette-apply-preset]')?.addEventListener('click', usePreset);
  panel.querySelector('[data-palette-extract]')?.addEventListener('click', extract); panel.querySelector('[data-palette-add]')?.addEventListener('click', () => { if (colors.length >= 12) return; colors.push(generateHarmony(base.value, colors.length + 1, harmony.value as Harmony).at(-1)!); count.value = String(colors.length); render(); });
  panel.querySelector('[data-palette-sample]')?.addEventListener('click', onSample); panel.querySelectorAll('[data-palette-export]').forEach(button => button.addEventListener('click', onExport));
  count.addEventListener('change', onCount); fgSelect.addEventListener('change', renderContrast); bgSelect.addEventListener('change', renderContrast); root.querySelector('[data-canvas="original"]')?.addEventListener('click', onCanvasClick); root.ownerDocument.addEventListener('worldcompiler:localechange', onLocale);
  severityControl?.addEventListener('input', onSeverity);
  const extractButton = panel.querySelector<HTMLButtonElement>('[data-palette-extract]')!; const sampleButton = panel.querySelector<HTMLButtonElement>('[data-palette-sample]')!;
  const observer = new MutationObserver(() => { const ready = root.dataset.state === 'ready'; extractButton.disabled = sampleButton.disabled = !ready; }); observer.observe(root, { attributes: true, attributeFilter: ['data-state'] });
  onLocale();
  return { destroy() { observer.disconnect(); severityControl?.removeEventListener('input', onSeverity); root.ownerDocument.removeEventListener('worldcompiler:localechange', onLocale); root.querySelector('[data-canvas="original"]')?.removeEventListener('click', onCanvasClick); } };
}
