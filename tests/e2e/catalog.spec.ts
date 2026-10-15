import { expect, test } from '@playwright/test';

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
  await expect(page.getByRole('article')).toHaveCount(10);
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
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '浏览工具目录' })).toHaveAttribute('href', '/world-compiler/tools/');
  await expect(page.getByText(/MIT/)).toBeVisible();
});

test('searches German catalog titles and tags', async ({ page }) => {
  await page.goto('./tools/');
  await page.getByRole('combobox', { name: '语言' }).selectOption('de');
  const search = page.getByRole('searchbox', { name: 'Werkzeuge suchen' });
  await search.fill('Klartext');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Klartext-Meter' })).toBeVisible();
});
