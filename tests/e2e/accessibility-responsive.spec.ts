import path from 'node:path';
import { expect, test } from '@playwright/test';

const fixture = path.resolve('tests/fixtures/color-grid.png');

for (const entry of [
  { name: 'catalog', url: './' },
  { name: 'Color Vision Lab', url: './tools/color-vision/' },
]) {
  test(`${entry.name} has one main landmark and no mobile horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(entry.url);

    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}

test('keyboard focus is visible and compact controls meet practical target size', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  await page.keyboard.press('Tab');

  const skipLink = page.getByRole('link', { name: '跳到主要内容' });
  await expect(skipLink).toBeFocused();
  expect(await skipLink.evaluate((element) => getComputedStyle(element).outlineWidth)).not.toBe('0px');

  for (const control of [
    page.getByRole('button', { name: 'English' }),
    page.getByRole('button', { name: '深色' }),
    page.getByRole('button', { name: '视觉' }),
  ]) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }
});

test('reduced-motion preference removes meaningful transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');

  const duration = await page.getByRole('link', { name: '跳到主要内容' }).evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).transitionDuration) || 0,
  );
  expect(duration).toBeLessThanOrEqual(0.001);
});

test('the workbench remains operable at phone width after rendering', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./tools/color-vision/');
  await page.getByLabel('选择本地图片').setInputFiles(fixture);
  await expect(page.getByRole('status')).toContainText('完成');

  await expect(page.getByLabel('导出模式')).toBeEnabled();
  await expect(page.getByRole('button', { name: '导出图片' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
