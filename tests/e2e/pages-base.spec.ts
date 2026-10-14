import path from 'node:path';
import { expect, test } from '@playwright/test';

const fixture = path.resolve('tests/fixtures/color-grid.png');

test('catalog links, assets, and scripts stay under the Pages base', async ({ page }) => {
  await page.goto('./');

  const localUrls = await page.evaluate(() => [
    ...Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]'), (node) => node.getAttribute('href')),
    ...Array.from(document.querySelectorAll<HTMLImageElement>('img[src^="/"]'), (node) => node.getAttribute('src')),
    ...Array.from(document.querySelectorAll<HTMLScriptElement>('script[src^="/"]'), (node) => node.getAttribute('src')),
  ].filter(Boolean));

  expect(localUrls.length).toBeGreaterThan(0);
  expect(localUrls.every((url) => url?.startsWith('/world-compiler/'))).toBe(true);
  await page.getByRole('link', { name: '打开色觉实验室' }).click();
  await expect(page).toHaveURL(/\/world-compiler\/tools\/color-vision\/$/);
});

test('the simulation worker is emitted and loaded beneath the Pages base', async ({ page }) => {
  const workers: string[] = [];
  page.on('worker', (worker) => workers.push(worker.url()));
  await page.goto('./tools/color-vision/');
  await page.getByLabel('选择本地图片').setInputFiles(fixture);
  await expect(page.getByRole('status')).toContainText('完成');

  expect(workers).toHaveLength(1);
  expect(new URL(workers[0]!).pathname.startsWith('/world-compiler/')).toBe(true);
});
