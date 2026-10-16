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

  await expect(page.getByRole('region', { name: 'Color vision mode comparison' }).getByRole('heading', { name: 'Original' })).toBeVisible();
  await expect(page.getByLabel('Original preview canvas')).toBeVisible();
  await expect(page.locator('[data-vision-mode]')).toHaveCount(0);
  await expect(page.locator('canvas[data-canvas]')).toHaveCount(9);
  await expect(page).toHaveTitle('Color Vision Lab / World Compiler');
  await expect(page.getByRole('region', { name: 'Color vision mode comparison' })).toBeVisible();
  await expect(page.getByText('INPUT / Local file')).toBeVisible();
  await expect(page.getByText('OUTPUT / Local export')).toBeVisible();
  await expect(page.locator('[data-quality-row]')).toBeHidden();
  await page.getByLabel('Choose a local image').setInputFiles(fixture);
  await expect(page.getByRole('status')).toContainText('Complete');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-export-mode="protan"]').click();
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
  await expect(page.locator('canvas[data-canvas][data-rendered="true"]')).toHaveCount(9);
  await expect(page.getByRole('article')).toHaveCount(9);
  await expect(page.locator('[data-palette-preview-row]')).toHaveCount(9);
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
  await expect(page.locator('canvas[data-canvas][data-rendered="true"]')).toHaveCount(9);
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
  await setRange(page.locator('[data-severity]'), 75);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-export-mode="tritan"]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('world-compiler-tritan-75.jpg');
});

test('shows every deficiency mode together and updates all three weak-axis simulations at once', async ({ page }) => {
  await page.goto('./tools/color-vision/');
  await page.getByLabel('选择本地图片').setInputFiles(fixture);
  await expect(page.getByRole('status')).toContainText('完成');
  const simulation = page.locator('canvas[data-canvas="protan"]');
  const original = page.locator('canvas[data-canvas="original"]');
  const pixels = (canvas: HTMLCanvasElement) => {
    if (!canvas.width || !canvas.height) return [];
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    return Array.from({ length: Math.ceil(data.length / 4096) }, (_, index) => data[index * 4096]);
  };
  const originalSample = await original.evaluate(pixels);

  const severity = page.locator('[data-severity]');
  await setRange(severity, 0);
  await expect.poll(() => simulation.evaluate(pixels)).toEqual(originalSample);
  await setRange(severity, 65);
  await expect(simulation).toHaveAttribute('data-rendered', 'true');
  await expect(simulation).toHaveAttribute('aria-label', /红色弱/);
  await expect(page.locator('canvas[data-canvas][data-rendered="true"]')).toHaveCount(9);
  const modes = page.locator('.comparison-card');
  await expect(modes).toHaveCount(9);
  await expect(page.locator('[data-canvas="deuteranopia"]')).toBeVisible();
  await expect(page.locator('[data-canvas="tritanopia"]')).toBeVisible();
  await expect(page.locator('[data-canvas="blue-cone-monochromacy"]')).toBeVisible();

  const monochrome = page.locator('canvas[data-canvas="achromatopsia"]');
  await expect(monochrome).toHaveAttribute('data-rendered', 'true');
  await expect(simulation).toHaveAttribute('data-rendered', 'true');
  await expect(page.locator('canvas[data-canvas="blue-cone-monochromacy"]')).toHaveAttribute('data-rendered', 'true');
});

test('builds and audits editable palettes, applies presets, and samples image colors locally', async ({ page }) => {
  await page.goto('./tools/color-vision/');
  await page.getByLabel('选择本地图片').setInputFiles(fixture);
  await expect(page.getByRole('status')).toContainText('完成');
  await expect(page.locator('[data-palette-preview-row]')).toHaveCount(9);
  await page.locator('[data-palette-count]').fill('4');
  await page.locator('[data-palette-count]').dispatchEvent('change');
  await expect(page.locator('[data-palette-swatch]')).toHaveCount(4);
  await page.locator('[data-palette-base]').fill('#FF0000');
  await page.locator('[data-palette-count]').fill('3');
  await page.locator('[data-palette-harmony]').selectOption('triadic');
  await page.locator('[data-palette-generate]').click();
  await expect(page.locator('[data-palette-hex]').nth(0)).toHaveValue('#FF0000');
  await expect(page.locator('[data-palette-hex]').nth(1)).toHaveValue('#00FF00');
  await expect(page.locator('[data-palette-hex]').nth(2)).toHaveValue('#0000FF');
  await page.locator('[data-palette-preset]').selectOption('brand');
  await page.locator('[data-palette-apply-preset]').click();
  await expect(page.locator('[data-palette-swatch]')).toHaveCount(6);
  await page.locator('[data-palette-foreground]').selectOption('0');
  await page.locator('[data-palette-background]').selectOption('1');
  await expect(page.locator('[data-palette-contrast-row]')).toHaveCount(9);
  await page.locator('[data-palette-extract]').click();
  expect(await page.locator('[data-palette-swatch]').count()).toBeGreaterThan(1);
  await page.locator('[data-palette-sample]').click();
  await page.locator('[data-canvas="original"]').click({ position: { x: 50, y: 50 } });
  await expect(page.locator('[data-palette-status]')).toContainText('取样');
  const download = page.waitForEvent('download');
  await page.locator('[data-palette-export="json"]').click();
  expect((await download).suggestedFilename()).toBe('color-palette.json');
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
