// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountColorVisionLab, type ColorVisionDependencies } from '../../src/features/color-vision/controller';
import { ColorVisionError } from '../../src/features/color-vision/errors';
import type { DecodedImage } from '../../src/features/color-vision/image-io';

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect() {},
  } as unknown as CanvasRenderingContext2D);
});

afterEach(() => vi.restoreAllMocks());

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function workbench() {
  const modes = ['original', 'protan', 'deutan', 'tritan', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia', 'blue-cone-monochromacy'];
  document.body.innerHTML = `
    <div data-color-vision-lab data-state="empty">
      <input type="file" data-image-input>
      <div data-drop-zone></div>
      <p data-workbench-status></p>
      <div data-workbench-error hidden></div>
      <button data-reset>reset</button>
      <div data-severity-row><input type="range" data-severity min="0" max="100" value="100"><output data-severity-value></output></div>
      ${modes.map(mode => `<canvas data-canvas="${mode}"></canvas><button data-preview-target="${mode}"></button><button data-export-mode="${mode}" data-export></button>`).join('')}
      <select data-export-format><option value="image/png">png</option></select>
      <input data-export-quality value="0.9">
      <span data-quality-row hidden></span>
      <dialog data-preview-dialog><h2 data-dialog-title>preview</h2><canvas data-dialog-canvas></canvas><button data-dialog-close>close</button></dialog>
    </div>`;
  return document.querySelector<HTMLElement>('[data-color-vision-lab]')!;
}

function setFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('mountColorVisionLab', () => {
  it('rerenders the selected axis and exports with its active severity', async () => {
    const image: DecodedImage = { source: {} as ImageBitmap, width: 2, height: 2, cleanup: vi.fn() };
    const render = vi.fn(async (..._args: unknown[]) => undefined);
    const exportMode = vi.fn(async () => new Blob(['ok']));
    const dependencies = { decode: vi.fn().mockResolvedValue(image), render, exportMode, download: vi.fn() } as unknown as ColorVisionDependencies;
    const root = workbench();
    const controller = mountColorVisionLab(root, dependencies);
    setFile(root.querySelector<HTMLInputElement>('[data-image-input]')!, new File(['image'], 'image.png', { type: 'image/png' }));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const severity = root.querySelector<HTMLInputElement>('[data-severity]')!;
    severity.value = '35';
    severity.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(render.mock.calls.at(-1)?.slice(4)).toEqual([35]);
    root.querySelector<HTMLButtonElement>('[data-export-mode="tritan"]')!.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(exportMode).toHaveBeenCalledWith(image, 'tritan', expect.any(Object), 35);
    controller.destroy();
  });

  it('keeps only the latest selected file and cleans a stale decode', async () => {
    const first = deferred<DecodedImage>();
    const second = deferred<DecodedImage>();
    const firstCleanup = vi.fn();
    const secondCleanup = vi.fn();
    const decode = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const render = vi.fn(async () => undefined);
    const dependencies = { decode, render, exportMode: vi.fn(), download: vi.fn() } as unknown as ColorVisionDependencies;
    const root = workbench();
    const controller = mountColorVisionLab(root, dependencies);
    const input = root.querySelector<HTMLInputElement>('[data-image-input]')!;

    setFile(input, new File(['one'], 'one.png', { type: 'image/png' }));
    setFile(input, new File(['two'], 'two.png', { type: 'image/png' }));
    second.resolve({ source: {} as ImageBitmap, width: 2, height: 2, cleanup: secondCleanup });
    await Promise.resolve();
    await Promise.resolve();
    first.resolve({ source: {} as ImageBitmap, width: 1, height: 1, cleanup: firstCleanup });
    await Promise.resolve();
    await Promise.resolve();

    expect(render).toHaveBeenCalledTimes(1);
    expect(root.dataset.state).toBe('ready');
    expect(firstCleanup).toHaveBeenCalledOnce();
    controller.destroy();
    expect(secondCleanup).toHaveBeenCalledOnce();
  });

  it('maps decode failure to error state and reset returns to empty', async () => {
    const dependencies = {
      decode: vi.fn().mockRejectedValue(new Error('broken')),
      render: vi.fn(), exportMode: vi.fn(), download: vi.fn(),
    } as unknown as ColorVisionDependencies;
    const root = workbench();
    const controller = mountColorVisionLab(root, dependencies);

    setFile(root.querySelector<HTMLInputElement>('[data-image-input]')!, new File(['bad'], 'bad.png', { type: 'image/png' }));
    await Promise.resolve();
    await Promise.resolve();
    expect(root.dataset.state).toBe('error');
    expect(root.querySelector('[data-workbench-error]')?.hasAttribute('hidden')).toBe(false);

    root.querySelector<HTMLButtonElement>('[data-reset]')!.click();
    expect(root.dataset.state).toBe('empty');
    controller.destroy();
  });

  it('invalidates a pending render when reset is pressed', async () => {
    const renderStarted = deferred<() => boolean>();
    const finishRender = deferred<void>();
    const dependencies = {
      decode: vi.fn().mockResolvedValue({ source: {} as ImageBitmap, width: 2, height: 2, cleanup: vi.fn() }),
      render: vi.fn(async (_image, _canvases, _request, isCurrent) => {
        renderStarted.resolve(isCurrent);
        await finishRender.promise;
      }),
      exportMode: vi.fn(), download: vi.fn(),
    } as unknown as ColorVisionDependencies;
    const root = workbench();
    const controller = mountColorVisionLab(root, dependencies);
    setFile(root.querySelector<HTMLInputElement>('[data-image-input]')!, new File(['image'], 'image.png', { type: 'image/png' }));
    const isCurrent = await renderStarted.promise;

    root.querySelector<HTMLButtonElement>('[data-reset]')!.click();
    expect(isCurrent()).toBe(false);
    finishRender.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(root.dataset.state).toBe('empty');
    controller.destroy();
  });

  it('shows the localized recovery message for a typed image error', async () => {
    const dependencies = {
      decode: vi.fn().mockRejectedValue(new ColorVisionError('too-large', 'too large')),
      render: vi.fn(), exportMode: vi.fn(), download: vi.fn(),
    } as unknown as ColorVisionDependencies;
    const root = workbench();
    const controller = mountColorVisionLab(root, dependencies);

    setFile(root.querySelector<HTMLInputElement>('[data-image-input]')!, new File(['image'], 'image.png', { type: 'image/png' }));
    await Promise.resolve();
    await Promise.resolve();
    expect(root.querySelector('[data-workbench-error]')?.textContent).toContain('选择较小');

    document.documentElement.lang = 'en';
    document.dispatchEvent(new CustomEvent('worldcompiler:localechange'));
    expect(root.querySelector('[data-workbench-error]')?.textContent).toContain('Choose a smaller');
    controller.destroy();
  });

  it('does not download a completed export after reset', async () => {
    const exportResult = deferred<Blob>();
    const image: DecodedImage = { source: {} as ImageBitmap, width: 2, height: 2, cleanup: vi.fn() };
    const dependencies = { decode: vi.fn().mockResolvedValue(image), render: vi.fn(async () => undefined), exportMode: vi.fn(() => exportResult.promise), download: vi.fn() } as unknown as ColorVisionDependencies;
    const root = workbench();
    const controller = mountColorVisionLab(root, dependencies);
    setFile(root.querySelector<HTMLInputElement>('[data-image-input]')!, new File(['image'], 'image.png', { type: 'image/png' }));
    await vi.waitFor(() => expect(root.dataset.state).toBe('ready'));
    root.querySelector<HTMLButtonElement>('[data-export-mode="protan"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-reset]')!.click();
    exportResult.resolve(new Blob(['image']));
    await Promise.resolve(); await Promise.resolve();
    expect(dependencies.download).not.toHaveBeenCalled();
    controller.destroy();
  });

  it('does not show a stale export error after reset', async () => {
    const exportResult = deferred<Blob>();
    const image: DecodedImage = { source: {} as ImageBitmap, width: 2, height: 2, cleanup: vi.fn() };
    const dependencies = {
      decode: vi.fn().mockResolvedValue(image),
      render: vi.fn(async () => undefined),
      exportMode: vi.fn(() => exportResult.promise), download: vi.fn(),
    } as unknown as ColorVisionDependencies;
    const root = workbench();
    const controller = mountColorVisionLab(root, dependencies);
    setFile(root.querySelector<HTMLInputElement>('[data-image-input]')!, new File(['image'], 'image.png', { type: 'image/png' }));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(root.dataset.state).toBe('ready');
    root.querySelector<HTMLButtonElement>('[data-export-mode="protan"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-reset]')!.click();
    exportResult.reject(new ColorVisionError('processing-failed', 'worker replaced'));
    await Promise.resolve();
    await Promise.resolve();
    expect(root.dataset.state).toBe('empty');
    controller.destroy();
  });
});
