// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountColorVisionLab, type ColorVisionDependencies } from '../../src/features/color-vision/controller';
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
  document.body.innerHTML = `
    <div data-color-vision-lab data-state="empty">
      <input type="file" data-image-input>
      <div data-drop-zone></div>
      <p data-workbench-status></p>
      <div data-workbench-error hidden></div>
      <button data-reset>reset</button>
      <canvas data-mode="original"></canvas>
      <canvas data-mode="protanopia"></canvas>
      <canvas data-mode="deuteranopia"></canvas>
      <canvas data-mode="tritanopia"></canvas>
      <canvas data-mode="achromatopsia"></canvas>
      <select data-export-mode><option value="protanopia">p</option></select>
      <select data-export-format><option value="image/png">png</option></select>
      <input data-export-quality value="0.9">
      <span data-quality-row hidden></span>
      <button data-export>export</button>
      <dialog data-preview-dialog><h2 data-dialog-title>preview</h2><canvas data-dialog-canvas></canvas><button data-dialog-close>close</button></dialog>
    </div>`;
  return document.querySelector<HTMLElement>('[data-color-vision-lab]')!;
}

function setFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('mountColorVisionLab', () => {
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
});
