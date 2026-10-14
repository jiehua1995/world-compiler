import { expect, test } from '@playwright/test';

test('offers a keyboard-visible skip link and Chinese shell by default', async ({ page }) => {
  await page.goto('./');

  const skipLink = page.getByRole('link', { name: '跳到主要内容' });
  await page.keyboard.press('Tab');
  await expect(skipLink).toBeFocused();
  await skipLink.press('Enter');

  await expect(page.locator('main')).toBeFocused();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('编译成可用工具');
  await expect(page.getByRole('link', { name: '世界编译局 / World Compiler' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
});

test('switches the full document to English with the keyboard', async ({ page }) => {
  await page.goto('./');

  const english = page.getByRole('button', { name: 'English' });
  await english.focus();
  await page.keyboard.press('Enter');

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle(/^World Compiler/);
  await expect(page.getByText('Language', { exact: true })).toBeVisible();
  await expect(english).toHaveAttribute('aria-pressed', 'true');
});

test('persists explicit theme choices and exposes system mode', async ({ page }) => {
  await page.goto('./');

  await page.getByRole('button', { name: '深色' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: '深色' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: '跟随系统' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'system');
});

test('remains interactive when local storage is denied', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException('Denied', 'SecurityError');
    };
    Storage.prototype.setItem = () => {
      throw new DOMException('Denied', 'SecurityError');
    };
  });
  await page.goto('./');

  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('button', { name: 'Dark' }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('applies a stored dark theme before the document becomes interactive', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('world-compiler:theme', 'dark');
  });

  await page.goto('./', { waitUntil: 'domcontentloaded' });

  expect(await page.locator('html').getAttribute('data-theme')).toBe('dark');
});
