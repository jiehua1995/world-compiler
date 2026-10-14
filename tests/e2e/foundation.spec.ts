import { expect, test } from '@playwright/test';

test('serves the World Compiler root without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('./');

  await expect(page).toHaveTitle(/World Compiler/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('World Compiler');
  expect(errors).toEqual([]);
});
