import path from 'node:path';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const fixture = path.resolve('tests/fixtures/color-grid.png');
const corruptFixture = path.resolve('tests/fixtures/not-an-image.png');

test('imports locally and renders five labelled comparisons without uploads', async ({ page }) => {
  const externalDataRequests: string[] = [];
  page.on('request', (request) => {
    if (['xhr', 'fetch', 'websocket'].includes(request.resourceType())) externalDataRequests.push(request.url());
  });
  await page.goto('./tools/color-vision/');

  await page.getByLabel('选择本地图片').setInputFiles(fixture);

  await expect(page.getByRole('status')).toContainText('完成');
  await expect(page.locator('canvas[data-mode][data-rendered="true"]')).toHaveCount(5);
  await expect(page.getByRole('article')).toHaveCount(5);
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
  await expect(page.locator('canvas[data-mode][data-rendered="true"]')).toHaveCount(5);
});

test('opens a focus-managed preview and restores its trigger', async ({ page }) => {
  await page.goto('./tools/color-vision/');
  await page.getByLabel('选择本地图片').setInputFiles(fixture);
  await expect(page.getByRole('status')).toContainText('完成');

  const trigger = page.getByRole('button', { name: '放大查看 绿色盲' });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: '绿色盲预览' })).toBeVisible();
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
  await page.getByLabel('导出模式').selectOption('tritanopia');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出图片' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/tritanopia\.jpg$/);
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
