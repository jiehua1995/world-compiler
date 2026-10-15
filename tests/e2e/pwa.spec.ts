import { expect, test } from '@playwright/test';

test('static app shell works offline without caching submitted query content', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/world-compiler/sw.js', { scope: '/world-compiler/' });
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.evaluate(async () => {
    await fetch('/world-compiler/?private-text=do-not-store');
    const keys = await caches.keys();
    for (const key of keys) {
      const cache = await caches.open(key);
      if ((await cache.keys()).some((request) => new URL(request.url).search)) throw new Error('Query content cached');
    }
  });
  await context.setOffline(true);
  await page.goto('./');
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('h1')).toBeVisible();
});
