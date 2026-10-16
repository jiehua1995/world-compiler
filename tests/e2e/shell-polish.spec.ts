import { expect, test } from '@playwright/test';
import { contrastRatio, parseHexColor } from '../../src/features/contrast-lens/contrast';

test('long German branding wraps even with wider fallback font metrics', async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('./');
  await page.locator('[data-locale-select]').selectOption('de');
  await page.locator('.brand__copy strong').evaluate(element=>{ (element as HTMLElement).style.cssText='font-family:monospace;font-size:28px'; });
  expect(await page.locator('.brand__copy').evaluate(element=>element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('clock minute hand stays distinguishable on the dark face', async ({page})=>{
  await page.goto('./');
  await page.locator('[data-theme-value="dark"]').click();
  const stroke = await page.locator('.clock-hand--minute').evaluate(element=>getComputedStyle(element).stroke);
  const [r,g,b] = stroke.match(/\d+/g)!.map(Number);
  expect(contrastRatio({r,g,b},parseHexColor('#0d1b2b')!)).toBeGreaterThanOrEqual(3);
});

test('homepage clock tracks device time and the call to action is centered', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-15T10:20:30') });
  await page.goto('./');
  const clock = page.locator('[data-clock-time]');
  await expect(clock).toContainText('10:20:30');
  await page.clock.runFor(1000);
  await expect(clock).toContainText('10:20:31');
  const cta = await page.getByRole('link', { name: '浏览工具目录' }).boundingBox();
  const frame = await page.locator('.site-frame').boundingBox();
  expect(Math.abs(cta!.x + cta!.width / 2 - frame!.x - frame!.width / 2)).toBeLessThan(2);
  await expect(page.getByRole('link', { name: '关于项目' })).toHaveAttribute('href', '/world-compiler/about/');
  await expect(page.getByRole('link', { name: 'World Compiler on GitHub' })).toBeVisible();
});

test('codec controls and input/output panels align', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./tools/codec-lab/');
  const control = await page.locator('[data-codec-mode]').boundingBox();
  const run = await page.locator('[data-codec-run]').boundingBox();
  expect(Math.abs(control!.y + control!.height - run!.y - run!.height)).toBeLessThan(2);
  const input = await page.locator('[data-codec-input]').boundingBox();
  const output = await page.locator('[data-codec-output]').boundingBox();
  expect(Math.abs(input!.y - output!.y)).toBeLessThan(2);
  expect(Math.abs(input!.height - output!.height)).toBeLessThan(2);
});

test('mobile navigation and language flags remain visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.getByRole('link', { name: '关于项目' })).toBeVisible();
  await page.getByRole('combobox', { name: '语言' }).selectOption('de');
  await expect(page.locator('[data-locale-flag="de"]')).toBeVisible();
  await expect(page.locator('[data-locale-flag="zh-CN"]')).toBeHidden();
  await page.getByRole('link', { name: 'Über das Projekt' }).click();
  await expect(page).toHaveURL(/\/about\/$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
