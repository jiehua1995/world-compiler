import { expect, test } from '@playwright/test';
import { tools } from '../../src/data/tools';

test('filters the bilingual catalog and announces result counts', async ({ page }) => {
  await page.goto('./tools/');

  const search = page.getByRole('searchbox', { name: '搜索工具' });
  await search.fill('色觉');

  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('status')).toContainText('1');
  await expect(search).toBeFocused();

  const textCategory = page.getByRole('button', { name: '文本' });
  await textCategory.click();
  await expect(page.getByText('没有匹配的工具')).toBeVisible();
  await expect(textCategory).toBeFocused();

  await page.getByRole('button', { name: '重置筛选' }).click();
  await expect(page.getByRole('article')).toHaveCount(tools.length);
});

test('searches English content after language switching', async ({ page }) => {
  await page.goto('./tools/');
  await page.getByRole('combobox', { name: '语言' }).selectOption('en');

  await page.getByRole('searchbox', { name: 'Search tools' }).fill('color vision');

  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Color Vision Lab' })).toBeVisible();
});

test('links the available tool through the configured Pages base', async ({ page }) => {
  await page.goto('./tools/');

  const toolLink = page.getByRole('link', { name: '打开色觉实验室' });
  await expect(toolLink).toHaveAttribute('href', '/world-compiler/tools/color-vision/');
});

test('keeps the landing page card-free and links to the separate directory', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.tool-card')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '浏览工具目录' })).toHaveAttribute('href', '/world-compiler/tools/');
  await expect(page.getByText(/MIT/)).toBeVisible();
});

test('about page is a project dossier, distinct from the landing-page pitch', async ({ page }) => {
  await page.goto('./about/');
  await expect(page.getByRole('heading', { name: '世界编译局是什么' })).toBeVisible();
  await expect(page.locator('.about-dossier__facts > div')).toHaveCount(4);
  await expect(page.locator('.home-principles')).toHaveCount(0);
  await expect(page.locator('[data-install-icon]')).toHaveCount(1);
  await page.getByRole('combobox', { name: '语言' }).selectOption('en');
  await expect(page.locator('[data-install-label]')).toHaveText('Install app');
  await expect(page.locator('[data-install-icon]')).toHaveCount(1);
});

test('searches German catalog titles and tags', async ({ page }) => {
  await page.goto('./tools/');
  await page.getByRole('combobox', { name: '语言' }).selectOption('de');
  const search = page.getByRole('searchbox', { name: 'Werkzeuge suchen' });
  await search.fill('Klartext-Meter');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Klartext-Meter' })).toBeVisible();
});
