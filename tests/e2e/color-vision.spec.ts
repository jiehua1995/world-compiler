import path from 'node:path';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const fixture = path.resolve('tests/fixtures/color-grid.png');
const corruptFixture = path.resolve('tests/fixtures/not-an-image.png');
const setRange = (range: import('@playwright/test').Locator, value: number) => range.evaluate((input: HTMLInputElement, next) => {
  input.value = String(next);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}, value);

test('applies a stored English locale to the complete workbench on first load', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('world-compiler:locale', 'en');
  });

  await page.goto('./tools/color-vision/');

  await expect(page.getByRole('heading', { name: 'Original' })).toBeVisible();
  await expect(page.getByLabel('Original preview canvas')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Color-vision simulation mode' })).toHaveValue('protan');
  await expect(page).toHaveTitle('Color Vision Lab / World Compiler');
  await expect(page.getByRole('region', { name: 'Color vision mode comparison' })).toBeVisible();
  await expect(page.getByText('INPUT / Local file')).toBeVisible();
  await expect(page.getByText('OUTPUT / Local export')).toBeVisible();
  await expect(page.locator('[data-quality-row]')).toBeHidden();
  await page.getByLabel('Choose a local image').setInputFiles(fixture);
  await expect(page.getByRole('status')).toContainText('Complete');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export image' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('world-compiler-protan-100.png');
});

test('cancels an in-flight comparison when reset is pressed', async ({ page }) => {
  await page.goto('./tools/color-vision/');
  await page.evaluate(() => {
    const worker = window.Worker;
    window.Worker = class extends worker {
      postMessage(message: unknown) {
        setTimeout(() => super.postMessage(message), 400);
      }
    };
  });
  await page.reload();
  await page.getByLabel('选择本地图片').setInputFiles(fixture);
  await expect(page.getByRole('status')).toContainText('正在生成');
  await page.getByRole('button', { name: '重置工作台' }).click();
  await expect(page.getByRole('status')).toHaveText('等待导入图片');
  await page.waitForTimeout(1500);
  await expect(page.locator('canvas[data-rendered="true"]')).toHaveCount(0);
});

test('keeps error text localized after switching language', async ({ page }) => {
  await page.goto('./tools/color-vision/');
  await page.getByRole('combobox', { name: '语言' }).selectOption('en');
  await page.getByLabel('Choose a local image').setInputFiles(corruptFixture);
  await expect(page.getByRole('alert')).toContainText('Cannot read this file');
  await page.getByRole('combobox', { name: 'Language' }).selectOption('zh-CN');
  await expect(page.getByRole('alert')).toContainText('无法读取');
});

test('imports locally and renders original and selected comparisons without uploads', async ({ page }) => {
  const externalDataRequests: string[] = [];
  page.on('request', (request) => {
    if (['xhr', 'fetch', 'websocket'].includes(request.resourceType())) externalDataRequests.push(request.url());
  });
  await page.goto('./tools/color-vision/');

  await page.getByLabel('选择本地图片').setInputFiles(fixture);

  await expect(page.getByRole('status')).toContainText('完成');
  await expect(page.locator('canvas[data-canvas][data-rendered="true"]')).toHaveCount(2);
  await expect(page.getByRole('article')).toHaveCount(2);
  expect(externalDataRequests).toEqual([]);
});

test('accepts the same local image through drag and drop', async ({ page }) => {
  await page.goto('./tools/color-vision/');
  const base64 = readFileSync(fixture).toString('base64');
  const dataTransfer = await page.evaluateHandle((encoded) => {
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], 'color-grid.png', { type: 'image/png' }));
    return transfer;
  }, base64);

  await page.locator('[data-drop-zone]').dispatchEvent('drop', { dataTransfer });

  await expect(page.getByRole('status')).toContainText('完成');
  await expect(page.locator('canvas[data-canvas][data-rendered="true"]')).toHaveCount(2);
});

test('opens a focus-managed preview and restores its trigger', async ({ page }) => {
  await page.goto('./tools/color-vision/');
  await page.getByLabel('选择本地图片').setInputFiles(fixture);
  await expect(page.getByRole('status')).toContainText('完成');

  const trigger = page.getByRole('button', { name: '放大查看 红色弱 / Protanomaly' });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: '红色弱 / Protanomaly预览' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('exports the selected JPEG and reveals quality control', async ({ page }) => {
  await page.goto('./tools/color-vision/');
  await page.getByLabel('选择本地图片').setInputFiles(fixture);
  await expect(page.getByRole('status')).toContainText('完成');

  await page.getByLabel('导出格式').selectOption('image/jpeg');
  await expect(page.getByLabel('JPEG 质量')).toBeVisible();
  await page.getByLabel('导出格式').selectOption('image/png');
  await expect(page.locator('[data-quality-row]')).toBeHidden();
  await page.getByLabel('导出格式').selectOption('image/jpeg');
  await page.getByLabel('色觉模拟模式').selectOption('tritan');
  await setRange(page.locator('[data-severity]'), 75);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出图片' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('world-compiler-tritan-75.jpg');
});

test('updates each deficiency axis at its selected severity and supports monochrome presets', async ({ page }) => {
  await page.goto('./tools/color-vision/');
  await page.getByLabel('选择本地图片').setInputFiles(fixture);
  await expect(page.getByRole('status')).toContainText('完成');
  const simulation = page.locator('canvas[data-canvas="simulation"]');
  const original = page.locator('canvas[data-canvas="original"]');
  const pixels = (canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    return Array.from({ length: Math.ceil(data.length / 4096) }, (_, index) => data[index * 4096]);
  };
  const originalSample = await original.evaluate(pixels);

  const modes = page.getByLabel('色觉模拟模式');
  const severity = page.locator('[data-severity]');
  for (const [axis, label] of [['protan', '红色弱'], ['deutan', '绿色弱'], ['tritan', '蓝黄色弱']] as const) {
    await modes.selectOption(axis);
    await setRange(severity, 0);
    await expect(simulation).toHaveAttribute('data-rendered', 'true');
    await expect.poll(() => simulation.evaluate(pixels)).toEqual(originalSample);
    await setRange(severity, 65);
    await expect(simulation).toHaveAttribute('data-rendered', 'true');
    await expect(simulation).toHaveAttribute('aria-label', new RegExp(label));
  }

  await modes.selectOption('achromatopsia');
  await expect(severity).toBeHidden();
  await expect(simulation).toHaveAttribute('data-rendered', 'true');
  await modes.selectOption('blue-cone-monochromacy');
  await expect(simulation).toHaveAttribute('data-rendered', 'true');
  await expect(simulation).toHaveAttribute('aria-label', /蓝锥单色视/);
});

test('recovers from a corrupt image and remains keyboard operable', async ({ page }) => {
  await page.goto('./tools/color-vision/');
  const input = page.getByLabel('选择本地图片');
  await input.setInputFiles(corruptFixture);
  await expect(page.getByRole('alert')).toContainText('无法读取');

  await page.getByRole('button', { name: '重置工作台' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('等待导入图片')).toBeVisible();

  await input.setInputFiles(fixture);
  await expect(page.getByRole('status')).toContainText('完成');
});
