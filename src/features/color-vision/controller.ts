import { fitWithin } from './dimensions';
import { ColorVisionError } from './errors';
import { exportSimulation, type ExportOptions } from './export-image';
import { decodeLocalImage, type DecodedImage } from './image-io';
import { SimulationWorkerClient } from './worker-client';
import type { VisionMode } from './types';

const modes: readonly VisionMode[] = ['original', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];
type WorkbenchState = 'empty' | 'decoding' | 'processing' | 'ready' | 'error';

export interface ColorVisionDependencies {
  decode(file: File): Promise<DecodedImage>;
  render(decoded: DecodedImage, canvases: Map<VisionMode, HTMLCanvasElement>, requestId: number, isCurrent: () => boolean): Promise<void>;
  exportMode(decoded: DecodedImage, mode: VisionMode, options: ExportOptions): Promise<Blob>;
  download(blob: Blob, filename: string): void;
  dispose?(): void;
}

function createBrowserDependencies(): ColorVisionDependencies {
  const worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });
  const client = new SimulationWorkerClient(worker);
  let exportRequestId = 0;

  return {
    decode: decodeLocalImage,
    async render(decoded, canvases, requestId, isCurrent) {
      const dimensions = fitWithin(decoded.width, decoded.height, 1200, 1_200_000);
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = dimensions.width;
      sourceCanvas.height = dimensions.height;
      const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
      if (!sourceContext) throw new ColorVisionError('processing-failed', 'Canvas 2D is unavailable.');
      sourceContext.drawImage(decoded.source, 0, 0, dimensions.width, dimensions.height);
      const sourcePixels = sourceContext.getImageData(0, 0, dimensions.width, dimensions.height).data;

      for (const [index, mode] of modes.entries()) {
        if (!isCurrent()) return;
        const canvas = canvases.get(mode);
        const context = canvas?.getContext('2d');
        if (!canvas || !context) throw new ColorVisionError('processing-failed', 'A preview canvas is unavailable.');
        const pixels = mode === 'original'
          ? new Uint8ClampedArray(sourcePixels)
          : await client.process(requestId * 10 + index, sourcePixels, mode);
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
    exportMode: (decoded, mode, options) => exportSimulation(
      decoded.source,
      decoded,
      mode,
      options,
      undefined,
      (pixels, visionMode) => client.process(--exportRequestId, pixels, visionMode),
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

const names: Record<VisionMode, { 'zh-CN': string; en: string }> = {
  original: { 'zh-CN': '原图', en: 'Original' },
  protan: { 'zh-CN': '红色轴', en: 'Protan' },
  deutan: { 'zh-CN': '绿色轴', en: 'Deutan' },
  tritan: { 'zh-CN': '蓝黄色轴', en: 'Tritan' },
  protanopia: { 'zh-CN': '红色盲', en: 'Protanopia' },
  deuteranopia: { 'zh-CN': '绿色盲', en: 'Deuteranopia' },
  tritanopia: { 'zh-CN': '蓝色盲', en: 'Tritanopia' },
  achromatopsia: { 'zh-CN': '全色盲', en: 'Achromatopsia' },
  'blue-cone-monochromacy': { 'zh-CN': '蓝锥单色视', en: 'Blue-cone monochromacy' },
};

const messages: Record<WorkbenchState, { 'zh-CN': string; en: string }> = {
  empty: { 'zh-CN': '等待导入图片', en: 'Waiting for an image' },
  decoding: { 'zh-CN': '正在读取图片…', en: 'Reading the image…' },
  processing: { 'zh-CN': '正在生成多模式对照…', en: 'Generating comparison modes…' },
  ready: { 'zh-CN': '处理完成，所有预览均可导出', en: 'Complete — every preview is ready to export' },
  error: { 'zh-CN': '处理未完成', en: 'Processing did not complete' },
};

const errorMessages: Record<ColorVisionError['code'], { 'zh-CN': string; en: string }> = {
  'unsupported-type': { 'zh-CN': '请选择 PNG、JPEG、WebP 或 GIF 图片。', en: 'Choose a PNG, JPEG, WebP, or GIF image.' },
  'decode-failed': { 'zh-CN': '无法解码这张图片，请确认文件未损坏。', en: 'This image could not be decoded. Check that the file is intact.' },
  'invalid-dimensions': { 'zh-CN': '图片尺寸无效，请选择其他图片。', en: 'This image has invalid dimensions. Choose another image.' },
  'too-large': { 'zh-CN': '图片尺寸超过浏览器安全处理范围，请选择较小的图片。', en: 'This image exceeds safe browser processing limits. Choose a smaller image.' },
  'processing-failed': { 'zh-CN': '无法生成预览，请重试或选择其他图片。', en: 'Previews could not be generated. Try again or choose another image.' },
  'export-failed': { 'zh-CN': '无法导出图片，请重试或更换格式。', en: 'The image could not be exported. Try again or choose another format.' },
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
  const exportMode = root.querySelector<HTMLSelectElement>('[data-export-mode]');
  const exportFormat = root.querySelector<HTMLSelectElement>('[data-export-format]');
  const exportQuality = root.querySelector<HTMLInputElement>('[data-export-quality]');
  const qualityRow = root.querySelector<HTMLElement>('[data-quality-row]');
  const exportButton = root.querySelector<HTMLButtonElement>('[data-export]');
  const dialog = root.querySelector<HTMLDialogElement>('[data-preview-dialog]');
  const dialogCanvas = root.querySelector<HTMLCanvasElement>('[data-dialog-canvas]');
  const dialogTitle = root.querySelector<HTMLElement>('[data-dialog-title]');
  const dialogClose = root.querySelector<HTMLButtonElement>('[data-dialog-close]');
  const previewButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-preview-mode]'));
  const canvases = new Map<VisionMode, HTMLCanvasElement>();
  root.querySelectorAll<HTMLCanvasElement>('canvas[data-mode]').forEach((canvas) => {
    canvases.set(canvas.dataset.mode as VisionMode, canvas);
  });

  if (!input || !dropZone || !status || !error || !reset || !exportMode || !exportFormat || !exportQuality || !qualityRow || !exportButton || !dialog || !dialogCanvas || !dialogTitle || !dialogClose) {
    throw new Error('Color Vision Lab markup is incomplete.');
  }

  let state: WorkbenchState = 'empty';
  let activeImage: DecodedImage | null = null;
  let requestId = 0;
  let currentError: ColorVisionError['code'] | undefined;
  let previewTrigger: HTMLButtonElement | null = null;
  let destroyed = false;

  const locale = () => root.ownerDocument.documentElement.lang === 'en' ? 'en' as const : 'zh-CN' as const;
  const localizeDynamic = () => {
    const activeLocale = locale();
    status.textContent = messages[state][activeLocale];
    error.textContent = currentError ? errorMessages[currentError][activeLocale] : '';
    previewButtons.forEach((button) => {
      const mode = button.dataset.previewMode as VisionMode;
      const name = names[mode][activeLocale];
      button.setAttribute('aria-label', activeLocale === 'en' ? `Inspect ${name}` : `放大查看 ${name}`);
      canvases.get(mode)?.setAttribute('aria-label', activeLocale === 'en' ? `${name} preview canvas` : `${name}预览画布`);
    });
    root.querySelectorAll<HTMLElement>('[data-copy-zh][data-copy-en]').forEach((element) => {
      element.textContent = activeLocale === 'en' ? element.dataset.copyEn ?? '' : element.dataset.copyZh ?? '';
    });
  };

  const setState = (next: WorkbenchState, problem?: unknown) => {
    state = next;
    currentError = next === 'error'
      ? problem instanceof ColorVisionError ? problem.code : 'decode-failed'
      : undefined;
    root.dataset.state = next;
    error.hidden = next !== 'error';
    const ready = next === 'ready';
    previewButtons.forEach((button) => { button.disabled = !ready; });
    [exportMode, exportFormat, exportQuality, exportButton].forEach((control) => { control.disabled = !ready; });
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
      setState('processing');
      await dependencies.render(decoded, canvases, currentRequest, () => !destroyed && requestId === currentRequest);
      if (destroyed || currentRequest !== requestId) return;
      setState('ready');
    } catch (problem) {
      if (currentRequest === requestId && !destroyed) setState('error', problem);
    }
  };

  const onInput = () => void loadFile(input.files?.[0]);
  const onDragOver = (event: DragEvent) => { event.preventDefault(); dropZone.classList.add('is-dragging'); };
  const onDragLeave = () => dropZone.classList.remove('is-dragging');
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
    void loadFile(event.dataTransfer?.files[0]);
  };
  const onFormat = () => { qualityRow.hidden = exportFormat.value !== 'image/jpeg'; };
  const onExport = async () => {
    if (!activeImage) return;
    const exportingImage = activeImage;
    const mode = exportMode.value as VisionMode;
    const format = exportFormat.value as ExportOptions['format'];
    exportButton.disabled = true;
    try {
      const blob = await dependencies.exportMode(activeImage, mode, { format, quality: Number(exportQuality.value) });
      const filename = locale() === 'en'
        ? `world-compiler-${mode}.${format === 'image/jpeg' ? 'jpg' : 'png'}`
        : `世界编译局-${names[mode]['zh-CN']}.${format === 'image/jpeg' ? 'jpg' : 'png'}`;
      dependencies.download(blob, filename);
    } catch (problem) {
      if (activeImage === exportingImage && !destroyed) setState('error', problem);
    } finally {
      if (state === 'ready' && activeImage === exportingImage) exportButton.disabled = false;
    }
  };
  const onPreview = (event: Event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const mode = button.dataset.previewMode as VisionMode;
    const source = canvases.get(mode);
    const context = dialogCanvas.getContext('2d');
    if (!source || !context) return;
    dialogCanvas.width = source.width;
    dialogCanvas.height = source.height;
    context.drawImage(source, 0, 0);
    const name = names[mode][locale()];
    dialogTitle.textContent = locale() === 'en' ? `${name} preview` : `${name}预览`;
    previewTrigger = button;
    dialog.showModal();
  };
  const onDialogClose = () => previewTrigger?.focus();
  const onLocale = () => localizeDynamic();

  input.addEventListener('change', onInput);
  dropZone.addEventListener('dragover', onDragOver);
  dropZone.addEventListener('dragleave', onDragLeave);
  dropZone.addEventListener('drop', onDrop);
  reset.addEventListener('click', resetWorkbench);
  exportFormat.addEventListener('change', onFormat);
  exportButton.addEventListener('click', onExport);
  previewButtons.forEach((button) => button.addEventListener('click', onPreview));
  dialogClose.addEventListener('click', () => dialog.close());
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
    exportFormat.removeEventListener('change', onFormat);
    exportButton.removeEventListener('click', onExport);
    previewButtons.forEach((button) => button.removeEventListener('click', onPreview));
    dialog.removeEventListener('close', onDialogClose);
    root.ownerDocument.removeEventListener('worldcompiler:localechange', onLocale);
  } };
}
