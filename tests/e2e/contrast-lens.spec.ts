import { expect, test } from '@playwright/test';

test('calculates contrast locally and recovers from invalid hex input', async ({ page }) => {
  await page.goto('./tools/contrast-lens/');
  const foreground = page.locator('[data-color-hex="foreground"]');
  const background = page.locator('[data-color-hex="background"]');
  await foreground.fill('#000000');
  await background.fill('#fff');
  await expect(page.locator('[data-contrast-ratio]')).toHaveText('21:1');
  await expect(page.locator('[data-result="normalAAA"]')).toHaveText('通过');

  await foreground.fill('#xyz');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(foreground).toHaveAttribute('aria-invalid', 'true');
  await foreground.fill('#777');
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(foreground).toHaveAttribute('aria-invalid', 'false');
});
