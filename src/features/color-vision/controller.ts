import { fitWithin } from './dimensions';
import { ColorVisionError } from './errors';
import { exportSimulation, type ExportOptions } from './export-image';
import { decodeLocalImage, type DecodedImage } from './image-io';
import { SimulationWorkerClient } from './worker-client';
import type { Locale } from '../../i18n/types';
import type { VisionMode } from './types';

type CanvasSlot = 'original' | 'simulation';
type WorkbenchState = 'empty' | 'decoding' | 'processing' | 'ready' | 'error';
const axisModes = new Set<VisionMode>(['protan', 'deutan', 'tritan']);
const selectableModes = new Set<VisionMode>(['original', 'protan', 'deutan', 'tritan', 'achromatopsia', 'blue-cone-monochromacy']);

export interface ColorVisionDependencies {
  decode(file: File): Promise<DecodedImage>;
  render(decoded: DecodedImage, canvases: Map<CanvasSlot, HTMLCanvasElement>, requestId: number, isCurrent: () => boolean, mode: VisionMode, severity: number): Promise<void>;
  exportMode(decoded: DecodedImage, mode: VisionMode, options: ExportOptions, severity: number): Promise<Blob>;
  download(blob: Blob, filename: string): void;
  dispose?(): void;
}

function createBrowserDependencies(): ColorVisionDependencies {
  const worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });
  const client = new SimulationWorkerClient(worker);
  let exportRequestId = 0;

  return {
    decode: decodeLocalImage,
    async render(decoded, canvases, requestId, isCurrent, mode, severity) {
      const dimensions = fitWithin(decoded.width, decoded.height, 1200, 1_200_000);
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = dimensions.width;
      sourceCanvas.height = dimensions.height;
      const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
      if (!sourceContext) throw new ColorVisionError('processing-failed', 'Canvas 2D is unavailable.');
      sourceContext.drawImage(decoded.source, 0, 0, dimensions.width, dimensions.height);
      const sourcePixels = sourceContext.getImageData(0, 0, dimensions.width, dimensions.height).data;

      for (const slot of ['original', 'simulation'] as const) {
        if (!isCurrent()) return;
        const canvas = canvases.get(slot);
        const context = canvas?.getContext('2d');
        if (!canvas || !context) throw new ColorVisionError('processing-failed', 'A preview canvas is unavailable.');
        const pixels = slot === 'original' || mode === 'original'
          ? new Uint8ClampedArray(sourcePixels)
          : await client.process(requestId, sourcePixels, mode, severity);
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
  processing: { 'zh-CN': '正在生成当前对照…', en: 'Generating the selected comparison…', de: 'Der ausgewählte Vergleich wird erstellt…' },
  ready: { 'zh-CN': '处理完成，预览可导出', en: 'Complete — preview is ready to export', de: 'Fertig — die Vorschau kann exportiert werden' },
  error: { 'zh-CN': '处理未完成', en: 'Processing did not complete', de: 'Verarbeitung nicht abgeschlossen' },
};

const errorMessages: Record<ColorVisionError['code'], Record<Locale, string>> = {
  'unsupported-type': { 'zh-CN': '请选择 PNG、JPEG、WebP 或 GIF 图片。', en: 'Choose a PNG, JPEG, WebP, or GIF image.', de: 'Wähle ein PNG-, JPEG-, WebP- oder GIF-Bild.' },
  'decode-failed': { 'zh-CN': '无法解码这张图片，请确认文件未损坏。', en: 'This image could not be decoded. Check that the file is intact.', de: 'Das Bild konnte nicht gelesen werden. Prüfe, ob die Datei intakt ist.' },
  'invalid-dimensions': { 'zh-CN': '图片尺寸无效，请选择其他图片。', en: 'This image has invalid dimensions. Choose another image.', de: 'Die Bildmaße sind ungültig. Wähle ein anderes Bild.' },
  'too-large': { 'zh-CN': '图片尺寸超过浏览器安全处理范围，请选择较小的图片。', en: 'This image exceeds safe browser processing limits. Choose a smaller image.', de: 'Das Bild überschreitet die sichere Verarbeitungsgröße. Wähle ein kleineres Bild.' },
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
  const modeControl = root.querySelector<HTMLSelectElement>('[data-vision-mode]');
  const severityControl = root.querySelector<HTMLInputElement>('[data-severity]');
  const severityRow = root.querySelector<HTMLElement>('[data-severity-row]');
  const severityValue = root.querySelector<HTMLElement>('[data-severity-value]');
  const exportFormat = root.querySelector<HTMLSelectElement>('[data-export-format]');
  const exportQuality = root.querySelector<HTMLInputElement>('[data-export-quality]');
  const qualityRow = root.querySelector<HTMLElement>('[data-quality-row]');
  const exportButton = root.querySelector<HTMLButtonElement>('[data-export]');
  const dialog = root.querySelector<HTMLDialogElement>('[data-preview-dialog]');
  const dialogCanvas = root.querySelector<HTMLCanvasElement>('[data-dialog-canvas]');
  const dialogTitle = root.querySelector<HTMLElement>('[data-dialog-title]');
  const dialogClose = root.querySelector<HTMLButtonElement>('[data-dialog-close]');
  const previewButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-preview-target]'));
  const simulationTitle = root.querySelector<HTMLElement>('[data-simulation-title]');
  const canvases = new Map<CanvasSlot, HTMLCanvasElement>();
  root.querySelectorAll<HTMLCanvasElement>('[data-canvas]').forEach((canvas) => {
    if (canvas.dataset.canvas === 'original' || canvas.dataset.canvas === 'simulation') canvases.set(canvas.dataset.canvas, canvas);
  });

  if (!input || !dropZone || !status || !error || !reset || !modeControl || !severityControl || !severityRow || !severityValue || !exportFormat || !exportQuality || !qualityRow || !exportButton || !dialog || !dialogCanvas || !dialogTitle || !dialogClose || !simulationTitle || canvases.size !== 2) {
    throw new Error('Color Vision Lab markup is incomplete.');
  }

  let state: WorkbenchState = 'empty';
  let activeImage: DecodedImage | null = null;
  let requestId = 0;
  let currentError: ColorVisionError['code'] | undefined;
  let previewTrigger: HTMLButtonElement | null = null;
  let mode = selectableModes.has(modeControl.value as VisionMode) ? modeControl.value as VisionMode : 'protan';
  let severity = Number(severityControl.value) || 100;
  let destroyed = false;

  const locale = (): Locale => root.ownerDocument.documentElement.lang === 'de' ? 'de' : root.ownerDocument.documentElement.lang === 'en' ? 'en' : 'zh-CN';
  const previewLabel = (name: string, activeLocale: Locale) => activeLocale === 'en' ? `Inspect ${name}` : activeLocale === 'de' ? `${name} vergrößern` : `放大查看 ${name}`;
  const localizeDynamic = () => {
    const activeLocale = locale();
    status.textContent = messages[state][activeLocale];
    error.textContent = currentError ? errorMessages[currentError][activeLocale] : '';
    const selectedName = names[mode][activeLocale];
    simulationTitle.textContent = selectedName;
    const labels: Record<CanvasSlot, string> = {
      original: activeLocale === 'en' ? 'Original preview canvas' : activeLocale === 'de' ? 'Original-Vorschau' : '原图预览画布',
      simulation: activeLocale === 'en' ? `${selectedName} preview canvas` : activeLocale === 'de' ? `${selectedName} Vorschau` : `${selectedName}预览画布`,
    };
    canvases.forEach((canvas, slot) => canvas.setAttribute('aria-label', labels[slot]));
    previewButtons.forEach((button) => {
      const slot = button.dataset.previewTarget as CanvasSlot;
      const name = slot === 'original' ? names.original[activeLocale] : selectedName;
      button.setAttribute('aria-label', previewLabel(name, activeLocale));
    });
    severityRow.hidden = !axisModes.has(mode);
    severityValue.textContent = `${severity}%`;
    severityControl.setAttribute('aria-valuetext', `${severity}%`);
    root.querySelectorAll<HTMLElement>('[data-copy-zh][data-copy-en][data-copy-de]').forEach((element) => {
      element.textContent = activeLocale === 'en' ? element.dataset.copyEn ?? '' : activeLocale === 'de' ? element.dataset.copyDe ?? '' : element.dataset.copyZh ?? '';
    });
  };

  const setState = (next: WorkbenchState, problem?: unknown) => {
    state = next;
    currentError = next === 'error' ? problem instanceof ColorVisionError ? problem.code : 'decode-failed' : undefined;
    root.dataset.state = next;
    error.hidden = next !== 'error';
    const ready = next === 'ready';
    previewButtons.forEach((button) => { button.disabled = !ready; });
    [exportFormat, exportQuality, exportButton].forEach((control) => { control.disabled = !ready; });
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
      await dependencies.render(image, canvases, currentRequest, () => !destroyed && requestId === currentRequest, mode, severity);
      if (!destroyed && requestId === currentRequest) setState('ready');
    } catch (problem) {
      if (!destroyed && requestId === currentRequest) setState('error', problem);
    }
  };

  const resetWorkbench = () => {
    requestId += 1;
    activeImage?.cleanup();
    activeImage = null;
    input.value = '';
    clearCanvases();
    if (dialog.open) dialog.close();
    setState('empty');
  };

  const loadFile = async (file?: File) => {
    if (!file || destroyed) return;
    const currentRequest = ++requestId;
    activeImage?.cleanup();
    activeImage = null;
    clearCanvases();
    setState('decoding');
    try {
      const decoded = await dependencies.decode(file);
      if (destroyed || currentRequest !== requestId) { decoded.cleanup(); return; }
      activeImage = decoded;
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
  const onDragOver = (event: DragEvent) => { event.preventDefault(); dropZone.classList.add('is-dragging'); };
  const onDragLeave = () => dropZone.classList.remove('is-dragging');
  const onDrop = (event: DragEvent) => { event.preventDefault(); dropZone.classList.remove('is-dragging'); void loadFile(event.dataTransfer?.files[0]); };
  const onMode = () => {
    if (!selectableModes.has(modeControl.value as VisionMode)) return;
    mode = modeControl.value as VisionMode;
    rerender();
  };
  const onSeverity = () => { severity = Math.max(0, Math.min(100, Number(severityControl.value) || 0)); rerender(); };
  const onFormat = () => { qualityRow.hidden = exportFormat.value !== 'image/jpeg'; };
  const onExport = async () => {
    if (!activeImage) return;
    const exportingImage = activeImage;
    const exportMode = mode;
    const exportSeverity = severity;
    const format = exportFormat.value as ExportOptions['format'];
    exportButton.disabled = true;
    try {
      const blob = await dependencies.exportMode(exportingImage, exportMode, { format, quality: Number(exportQuality.value) }, exportSeverity);
      const strength = axisModes.has(exportMode) ? `-${exportSeverity}` : '';
      dependencies.download(blob, `world-compiler-${exportMode}${strength}.${format === 'image/jpeg' ? 'jpg' : 'png'}`);
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
    const name = slot === 'original' ? names.original[activeLocale] : names[mode][activeLocale];
    dialogTitle.textContent = activeLocale === 'en' ? `${name} preview` : activeLocale === 'de' ? `${name} Vorschau` : `${name}预览`;
    previewTrigger = button;
    dialog.showModal();
  };
  const onDialogClose = () => previewTrigger?.focus();
  const onDialogCloseButton = () => dialog.close();
  const onLocale = () => localizeDynamic();

  input.addEventListener('change', onInput);
  dropZone.addEventListener('dragover', onDragOver);
  dropZone.addEventListener('dragleave', onDragLeave);
  dropZone.addEventListener('drop', onDrop);
  reset.addEventListener('click', resetWorkbench);
  modeControl.addEventListener('change', onMode);
  severityControl.addEventListener('input', onSeverity);
  exportFormat.addEventListener('change', onFormat);
  exportButton.addEventListener('click', onExport);
  previewButtons.forEach((button) => button.addEventListener('click', onPreview));
  dialogClose.addEventListener('click', onDialogCloseButton);
  dialog.addEventListener('close', onDialogClose);
  root.ownerDocument.addEventListener('worldcompiler:localechange', onLocale);
  setState('empty');

  return { destroy() {
    if (destroyed) return;
    destroyed = true;
    requestId += 1;
    activeImage?.cleanup();
    dependencies.dispose?.();
    input.removeEventListener('change', onInput);
    dropZone.removeEventListener('dragover', onDragOver);
    dropZone.removeEventListener('dragleave', onDragLeave);
    dropZone.removeEventListener('drop', onDrop);
    reset.removeEventListener('click', resetWorkbench);
    modeControl.removeEventListener('change', onMode);
    severityControl.removeEventListener('input', onSeverity);
    exportFormat.removeEventListener('change', onFormat);
    exportButton.removeEventListener('click', onExport);
    previewButtons.forEach((button) => button.removeEventListener('click', onPreview));
    dialogClose.removeEventListener('click', onDialogCloseButton);
    dialog.removeEventListener('close', onDialogClose);
    root.ownerDocument.removeEventListener('worldcompiler:localechange', onLocale);
  } };
}
