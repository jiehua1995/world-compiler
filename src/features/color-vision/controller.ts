import { fitWithin } from './dimensions';
import { ColorVisionError } from './errors';
import { exportSimulation, type ExportOptions } from './export-image';
import type { DecodedImage } from './image-io';
import { decodeVisionFile } from './document-io';
import { SimulationWorkerClient } from './worker-client';
import type { Locale } from '../../i18n/types';
import type { VisionMode } from './types';

type CanvasSlot = VisionMode;
type WorkbenchState = 'empty' | 'decoding' | 'processing' | 'ready' | 'error';
const axisModes = new Set<VisionMode>(['protan', 'deutan', 'tritan']);

export interface ColorVisionDependencies {
  decode(file: File, page?: number, signal?: AbortSignal): Promise<DecodedImage>;
  render(decoded: DecodedImage, canvases: Map<CanvasSlot, HTMLCanvasElement>, requestId: number, isCurrent: () => boolean, severity: number): Promise<void>;
  exportMode(decoded: DecodedImage, mode: VisionMode, options: ExportOptions, severity: number): Promise<Blob>;
  download(blob: Blob, filename: string): void;
  dispose?(): void;
}

function createBrowserDependencies(): ColorVisionDependencies {
  const worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });
  const client = new SimulationWorkerClient(worker);
  let exportRequestId = 0;

  return {
    decode: decodeVisionFile,
    async render(decoded, canvases, requestId, isCurrent, severity) {
      const dimensions = fitWithin(decoded.width, decoded.height, 1000, 600_000);
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = dimensions.width;
      sourceCanvas.height = dimensions.height;
      const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
      if (!sourceContext) throw new ColorVisionError('processing-failed', 'Canvas 2D is unavailable.');
      sourceContext.drawImage(decoded.source, 0, 0, dimensions.width, dimensions.height);
      const sourcePixels = sourceContext.getImageData(0, 0, dimensions.width, dimensions.height).data;

      for (const [slot, canvas] of canvases) {
        if (!isCurrent()) return;
        const context = canvas.getContext('2d');
        if (!context) throw new ColorVisionError('processing-failed', 'A preview canvas is unavailable.');
        const pixels = slot === 'original'
          ? new Uint8ClampedArray(sourcePixels)
          : await client.process(requestId, sourcePixels, slot, axisModes.has(slot) ? severity : 100);
        if (!isCurrent()) return;
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const imageData = context.createImageData(dimensions.width, dimensions.height);
        imageData.data.set(pixels);
        context.putImageData(imageData, 0, 0);
        canvas.dataset.rendered = 'true';
        canvas.closest<HTMLElement>('[data-comparison-card]')?.classList.add('is-rendered');
      }
    },
    exportMode: (decoded, mode, options, severity) => exportSimulation(
      decoded.source,
      decoded,
      mode,
      options,
      undefined,
      (pixels, visionMode, strength) => client.process(--exportRequestId, pixels, visionMode, strength),
      severity,
    ),
    download(blob, filename) {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
    dispose: () => client.dispose(),
  };
}

const names: Record<VisionMode, Record<Locale, string>> = {
  original: { 'zh-CN': '原图', en: 'Original', de: 'Original' },
  protan: { 'zh-CN': '红色弱 / Protanomaly', en: 'Red-weak / Protanomaly', de: 'Rot-Schwäche / Protanomalie' },
  deutan: { 'zh-CN': '绿色弱 / Deuteranomaly', en: 'Green-weak / Deuteranomaly', de: 'Grün-Schwäche / Deuteranomalie' },
  tritan: { 'zh-CN': '蓝黄色弱 / Tritanomaly', en: 'Blue-yellow weak / Tritanomaly', de: 'Blau-Gelb-Schwäche / Tritanomalie' },
  protanopia: { 'zh-CN': '红色盲', en: 'Protanopia', de: 'Protanopie' },
  deuteranopia: { 'zh-CN': '绿色盲', en: 'Deuteranopia', de: 'Deuteranopie' },
  tritanopia: { 'zh-CN': '蓝色盲', en: 'Tritanopia', de: 'Tritanopie' },
  achromatopsia: { 'zh-CN': '全色盲', en: 'Achromatopsia', de: 'Achromatopsie' },
  'blue-cone-monochromacy': { 'zh-CN': '蓝锥单色视', en: 'Blue-cone monochromacy', de: 'Blauzapfen-Monochromasie' },
};

const messages: Record<WorkbenchState, Record<Locale, string>> = {
  empty: { 'zh-CN': '等待导入图片', en: 'Waiting for an image', de: 'Warte auf ein Bild' },
  decoding: { 'zh-CN': '正在读取图片…', en: 'Reading the image…', de: 'Bild wird gelesen…' },
  processing: { 'zh-CN': '正在生成所有色觉对照…', en: 'Generating all comparisons…', de: 'Alle Vergleiche werden erstellt…' },
  ready: { 'zh-CN': '处理完成，预览可导出', en: 'Complete — preview is ready to export', de: 'Fertig — die Vorschau kann exportiert werden' },
  error: { 'zh-CN': '处理未完成', en: 'Processing did not complete', de: 'Verarbeitung nicht abgeschlossen' },
};

const errorMessages: Record<ColorVisionError['code'], Record<Locale, string>> = {
  'unsupported-type': { 'zh-CN': '请选择 PNG、JPEG、WebP、GIF、SVG 或 PDF 文件。', en: 'Choose a PNG, JPEG, WebP, GIF, SVG, or PDF file.', de: 'Wähle eine PNG-, JPEG-, WebP-, GIF-, SVG- oder PDF-Datei.' },
  'invalid-page': { 'zh-CN': '页码无效，请选择 PDF 中存在的页面。', en: 'Invalid page number. Select a page in this PDF.', de: 'Ungültige Seitennummer. Wähle eine vorhandene PDF-Seite.' },
  'pdf-password': { 'zh-CN': '此 PDF 需要密码，请先解锁后重新导入。', en: 'This PDF requires a password. Unlock it before importing.', de: 'Diese PDF benötigt ein Passwort. Vor dem Import entsperren.' },
  'decode-failed': { 'zh-CN': '无法读取此文件，请检查是否损坏；SVG 需包含有效尺寸，且不支持实体声明。', en: 'Cannot read this file. Check for corruption; SVG needs valid dimensions and cannot contain entity declarations.', de: 'Datei nicht lesbar. Auf Beschädigung prüfen; SVG benötigt gültige Maße und darf keine Entitätsdeklarationen enthalten.' },
  'invalid-dimensions': { 'zh-CN': '图片尺寸无效，请选择其他图片。', en: 'This image has invalid dimensions. Choose another image.', de: 'Die Bildmaße sind ungültig. Wähle ein anderes Bild.' },
  'too-large': { 'zh-CN': '文件或尺寸过大，请选择较小的文件。SVG 上限 5 MB、50,000 个元素，PDF 上限 32 MB；位图最长边 16,384 像素、总量 100 MP。', en: 'File or dimensions too large. Choose a smaller file. SVG: 5 MB / 50,000 elements; PDF: 32 MB; raster: 16,384 px per edge / 100 MP.', de: 'Datei oder Abmessungen zu groß. Wähle eine kleinere Datei. SVG: 5 MB / 50.000 Elemente; PDF: 32 MB; Raster: 16.384 px pro Kante / 100 MP.' },
  'processing-failed': { 'zh-CN': '无法生成预览，请重试或选择其他图片。', en: 'Previews could not be generated. Try again or choose another image.', de: 'Die Vorschau konnte nicht erstellt werden. Versuche es erneut oder wähle ein anderes Bild.' },
  'export-failed': { 'zh-CN': '无法导出图片，请重试或更换格式。', en: 'The image could not be exported. Try again or change the format.', de: 'Das Bild konnte nicht exportiert werden. Versuche es erneut oder ändere das Format.' },
};

export function mountColorVisionLab(
  root: HTMLElement,
  suppliedDependencies?: ColorVisionDependencies,
): { destroy(): void } {
  const dependencies = suppliedDependencies ?? createBrowserDependencies();
  const input = root.querySelector<HTMLInputElement>('[data-image-input]');
  const dropZone = root.querySelector<HTMLElement>('[data-drop-zone]');
  const status = root.querySelector<HTMLElement>('[data-workbench-status]');
  const error = root.querySelector<HTMLElement>('[data-workbench-error]');
  const reset = root.querySelector<HTMLButtonElement>('[data-reset]');
  const severityControl = root.querySelector<HTMLInputElement>('[data-severity]');
  const severityRow = root.querySelector<HTMLElement>('[data-severity-row]');
  const severityValue = root.querySelector<HTMLElement>('[data-severity-value]');
  const pdfControls = root.querySelector<HTMLElement>('[data-pdf-controls]');
  const pdfPage = root.querySelector<HTMLInputElement>('[data-pdf-page]');
  const pdfCount = root.querySelector<HTMLElement>('[data-pdf-count]');
  const pdfRender = root.querySelector<HTMLButtonElement>('[data-pdf-render]');
  const pdfForm = root.querySelector<HTMLFormElement>('[data-pdf-page-form]');
  const exportFormat = root.querySelector<HTMLSelectElement>('[data-export-format]');
  const exportQuality = root.querySelector<HTMLInputElement>('[data-export-quality]');
  const qualityRow = root.querySelector<HTMLElement>('[data-quality-row]');
  const exportButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-export-mode]'));
  const dialog = root.querySelector<HTMLDialogElement>('[data-preview-dialog]');
  const dialogCanvas = root.querySelector<HTMLCanvasElement>('[data-dialog-canvas]');
  const dialogTitle = root.querySelector<HTMLElement>('[data-dialog-title]');
  const dialogClose = root.querySelector<HTMLButtonElement>('[data-dialog-close]');
  const previewButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-preview-target]'));
  const canvases = new Map<CanvasSlot, HTMLCanvasElement>();
  root.querySelectorAll<HTMLCanvasElement>('[data-canvas]').forEach((canvas) => {
    if (canvas.dataset.canvas && canvas.dataset.canvas in names) canvases.set(canvas.dataset.canvas as CanvasSlot, canvas);
  });

  if (!input || !dropZone || !status || !error || !reset || !severityControl || !severityRow || !severityValue || !exportFormat || !exportQuality || !qualityRow || !exportButtons.length || !dialog || !dialogCanvas || !dialogTitle || !dialogClose || canvases.size !== 9) {
    throw new Error('Color Vision Lab markup is incomplete.');
  }

  let state: WorkbenchState = 'empty';
  let activeImage: DecodedImage | null = null;
  let requestId = 0;
  let currentError: ColorVisionError['code'] | undefined;
  let previewTrigger: HTMLButtonElement | null = null;
  let severity = Number(severityControl.value) || 100;
  let destroyed = false;
  let selectedFile: File | null = null;
  let decodeAbort: AbortController | null = null;

  const locale = (): Locale => root.ownerDocument.documentElement.lang === 'de' ? 'de' : root.ownerDocument.documentElement.lang === 'en' ? 'en' : 'zh-CN';
  const previewLabel = (name: string, activeLocale: Locale) => activeLocale === 'en' ? `Inspect ${name}` : activeLocale === 'de' ? `${name} vergrößern` : `放大查看 ${name}`;
  const localizeDynamic = () => {
    const activeLocale = locale();
    status.textContent = messages[state][activeLocale];
    error.textContent = currentError ? errorMessages[currentError][activeLocale] : '';
    canvases.forEach((canvas, slot) => canvas.setAttribute('aria-label', slot === 'original' ? (activeLocale === 'en' ? 'Original preview canvas' : activeLocale === 'de' ? 'Original-Vorschau' : '原图预览画布') : (activeLocale === 'en' ? `${names[slot].en} preview canvas` : activeLocale === 'de' ? `${names[slot].de} Vorschau` : `${names[slot]['zh-CN']}预览画布`)));
    previewButtons.forEach((button) => {
      const slot = button.dataset.previewTarget as CanvasSlot;
      const name = names[slot][activeLocale];
      button.setAttribute('aria-label', previewLabel(name, activeLocale));
    });
    exportButtons.forEach(button => { const name = names[button.dataset.exportMode as VisionMode][activeLocale]; button.setAttribute('aria-label', activeLocale === 'en' ? `Export ${name}` : activeLocale === 'de' ? `${name} exportieren` : `导出${name}`); });
    severityRow.hidden = false;
    severityValue.textContent = `${severity}%`;
    severityControl.setAttribute('aria-valuetext', `${severity}%`);
    root.querySelectorAll<HTMLElement>('[data-copy-zh][data-copy-en][data-copy-de]').forEach((element) => {
      element.textContent = activeLocale === 'en' ? element.dataset.copyEn ?? '' : activeLocale === 'de' ? element.dataset.copyDe ?? '' : element.dataset.copyZh ?? '';
    });
    if (pdfControls) pdfControls.hidden = !activeImage?.pageCount;
    if (pdfCount) pdfCount.textContent = activeImage?.pageCount ? (activeLocale === 'en' ? 'of ' : activeLocale === 'de' ? 'von ' : '共 ') + activeImage.pageCount + (activeLocale === 'zh-CN' ? ' 页' : '') : '';
  };

  const setState = (next: WorkbenchState, problem?: unknown) => {
    state = next;
    currentError = next === 'error' ? problem instanceof ColorVisionError ? problem.code : 'decode-failed' : undefined;
    root.dataset.state = next;
    error.hidden = next !== 'error';
    const ready = next === 'ready';
    previewButtons.forEach((button) => { button.disabled = !ready; });
    [exportFormat, exportQuality, ...exportButtons].forEach((control) => { control.disabled = !ready; });
    if (pdfRender) pdfRender.disabled = next === 'decoding' || next === 'processing';
    localizeDynamic();
  };

  const clearCanvases = () => {
    canvases.forEach((canvas) => {
      const context = canvas.getContext('2d');
      context?.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
      delete canvas.dataset.rendered;
      canvas.closest<HTMLElement>('[data-comparison-card]')?.classList.remove('is-rendered');
    });
  };

  const renderImage = async (image: DecodedImage, currentRequest: number) => {
    setState('processing');
    try {
      await dependencies.render(image, canvases, currentRequest, () => !destroyed && requestId === currentRequest, severity);
      if (!destroyed && requestId === currentRequest) setState('ready');
    } catch (problem) {
      if (!destroyed && requestId === currentRequest) setState('error', problem);
    }
  };

  const resetWorkbench = () => {
    requestId += 1;
    decodeAbort?.abort();
    decodeAbort = null;
    selectedFile = null;
    activeImage?.cleanup();
    activeImage = null;
    input.value = '';
    clearCanvases();
    if (dialog.open) dialog.close();
    setState('empty');
  };

  const loadFile = async (file?: File, page = 1) => {
    if (!file || destroyed) return;
    const currentRequest = ++requestId;
    decodeAbort?.abort();
    decodeAbort = new AbortController();
    selectedFile = file;
    activeImage?.cleanup();
    activeImage = null;
    clearCanvases();
    setState('decoding');
    try {
      const decoded = await dependencies.decode(file, page, decodeAbort.signal);
      if (destroyed || currentRequest !== requestId) { decoded.cleanup(); return; }
      activeImage = decoded;
      if (pdfPage) { pdfPage.value = String(decoded.pageNumber ?? 1); pdfPage.max = String(decoded.pageCount ?? 1); }
      await renderImage(decoded, currentRequest);
    } catch (problem) {
      if (currentRequest === requestId && !destroyed) setState('error', problem);
    }
  };

  const rerender = () => {
    clearCanvases();
    if (activeImage) void renderImage(activeImage, ++requestId);
    else localizeDynamic();
  };
  const onInput = () => void loadFile(input.files?.[0]);
  const onPdfPage = (event: Event) => { event.preventDefault(); if (selectedFile && pdfPage) void loadFile(selectedFile, Number(pdfPage.value)); };
  const onDragOver = (event: DragEvent) => { event.preventDefault(); dropZone.classList.add('is-dragging'); };
  const onDragLeave = () => dropZone.classList.remove('is-dragging');
  const onDrop = (event: DragEvent) => { event.preventDefault(); dropZone.classList.remove('is-dragging'); void loadFile(event.dataTransfer?.files[0]); };
  const onSeverity = () => { severity = Math.max(0, Math.min(100, Number(severityControl.value) || 0)); rerender(); };
  const onFormat = () => { qualityRow.hidden = exportFormat.value !== 'image/jpeg'; };
  const onExport = async (event: Event) => {
    if (!activeImage) return;
    const exportButton = event.currentTarget as HTMLButtonElement;
    const exportingImage = activeImage;
    const exportMode = exportButton.dataset.exportMode as VisionMode;
    const exportSeverity = severity;
    const format = exportFormat.value as ExportOptions['format'];
    exportButton.disabled = true;
    try {
      const blob = await dependencies.exportMode(exportingImage, exportMode, { format, quality: Number(exportQuality.value) }, exportSeverity);
      if (destroyed || activeImage !== exportingImage) return;
      const strength = axisModes.has(exportMode) ? `-${exportSeverity}` : '';
      const page = exportingImage.pageNumber ? `page-${exportingImage.pageNumber}-` : '';
      dependencies.download(blob, `world-compiler-${page}${exportMode}${strength}.${format === 'image/jpeg' ? 'jpg' : 'png'}`);
    } catch (problem) {
      if (activeImage === exportingImage && !destroyed) setState('error', problem);
    } finally {
      if (state === 'ready' && activeImage === exportingImage) exportButton.disabled = false;
    }
  };
  const onPreview = (event: Event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const slot = button.dataset.previewTarget as CanvasSlot;
    const source = canvases.get(slot);
    const context = dialogCanvas.getContext('2d');
    if (!source || !context) return;
    dialogCanvas.width = source.width;
    dialogCanvas.height = source.height;
    context.drawImage(source, 0, 0);
    const activeLocale = locale();
    const name = names[slot][activeLocale];
    dialogTitle.textContent = activeLocale === 'en' ? `${name} preview` : activeLocale === 'de' ? `${name} Vorschau` : `${name}预览`;
    previewTrigger = button;
    dialog.showModal();
  };
  const onDialogClose = () => previewTrigger?.focus();
  const onDialogCloseButton = () => dialog.close();
  const onLocale = () => localizeDynamic();

  input.addEventListener('change', onInput);
  pdfForm?.addEventListener('submit', onPdfPage);
  dropZone.addEventListener('dragover', onDragOver);
  dropZone.addEventListener('dragleave', onDragLeave);
  dropZone.addEventListener('drop', onDrop);
  reset.addEventListener('click', resetWorkbench);
  severityControl.addEventListener('input', onSeverity);
  exportFormat.addEventListener('change', onFormat);
  exportButtons.forEach(button => button.addEventListener('click', onExport));
  previewButtons.forEach((button) => button.addEventListener('click', onPreview));
  dialogClose.addEventListener('click', onDialogCloseButton);
  dialog.addEventListener('close', onDialogClose);
  root.ownerDocument.addEventListener('worldcompiler:localechange', onLocale);
  setState('empty');

  return { destroy() {
    if (destroyed) return;
    destroyed = true;
    requestId += 1;
    decodeAbort?.abort();
    activeImage?.cleanup();
    dependencies.dispose?.();
    input.removeEventListener('change', onInput);
    pdfForm?.removeEventListener('submit', onPdfPage);
    dropZone.removeEventListener('dragover', onDragOver);
    dropZone.removeEventListener('dragleave', onDragLeave);
    dropZone.removeEventListener('drop', onDrop);
    reset.removeEventListener('click', resetWorkbench);
    severityControl.removeEventListener('input', onSeverity);
    exportFormat.removeEventListener('change', onFormat);
    exportButtons.forEach(button => button.removeEventListener('click', onExport));
    previewButtons.forEach((button) => button.removeEventListener('click', onPreview));
    dialogClose.removeEventListener('click', onDialogCloseButton);
    dialog.removeEventListener('close', onDialogClose);
    root.ownerDocument.removeEventListener('worldcompiler:localechange', onLocale);
  } };
}
