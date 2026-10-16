import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

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

test('audits every pair in a 2–12 color token set and prevents out-of-range edits', async ({ page }) => {
  await page.goto('./tools/contrast-lens/');
  await expect(page.locator('[data-palette-token]')).toHaveCount(6);
  await expect(page.locator('[data-palette-pair]')).toHaveCount(15);
  for (let i = 0; i < 6; i += 1) await page.locator('[data-token-add]').click();
  await expect(page.locator('[data-palette-token]')).toHaveCount(12);
  await expect(page.locator('[data-token-add]')).toBeDisabled();
  await expect(page.locator('[data-palette-pair]')).toHaveCount(66);
  for (let i = 0; i < 10; i += 1) await page.locator('[data-token-remove]').last().click();
  await expect(page.locator('[data-palette-token]')).toHaveCount(2);
  await expect(page.locator('[data-token-remove]').first()).toBeDisabled();
});

test('applies an AA color suggestion and exports safe local HTML and JSON reports', async ({ page }) => {
  await page.goto('./tools/contrast-lens/');
  for (let i = 0; i < 4; i += 1) await page.locator('[data-token-remove]').last().click();
  const tokens = page.locator('[data-palette-token]');
  await tokens.nth(0).locator('[data-token-name]').fill('<script>bad</script>');
  await tokens.nth(0).locator('[data-token-hex]').fill('#777777');
  await tokens.nth(1).locator('[data-token-hex]').fill('#FFFFFF');
  await expect(page.locator('[data-palette-pair]')).toHaveCount(1);
  await expect(page.locator('[data-palette-pair]')).toContainText('4.48:1');
  await page.locator('[data-palette-suggest]').first().click();
  await expect(tokens.nth(0).locator('[data-token-hex]')).toHaveValue('#767676');
  await expect(tokens.nth(0).locator('[data-token-hex]')).toBeFocused();
  await expect(page.locator('[data-palette-pair]')).toContainText(/4\.5\d:1|4\.6\d:1|4\.7\d:1|4\.8\d:1|[5-9]\d?\.\d\d:1/);

  const jsonDownload = page.waitForEvent('download');
  await page.locator('[data-palette-export="json"]').click();
  const jsonFile = await jsonDownload;
  const json = JSON.parse(await readFile((await jsonFile.path())!, 'utf8'));
  expect(json.tokens[0].name).toBe('<script>bad</script>');
  expect(json.pairs).toHaveLength(1);
  expect(json.criteria).toEqual({ normalAA: 4.5, normalAAA: 7, largeAA: 3, largeAAA: 4.5, nonTextAA: 3 });

  const htmlDownload = page.waitForEvent('download');
  await page.locator('[data-palette-export="html"]').click();
  const htmlFile = await htmlDownload;
  const html = await readFile((await htmlFile.path())!, 'utf8');
  expect(html).toContain('&lt;script&gt;bad&lt;/script&gt;');
  expect(html).not.toContain('<script>bad</script>');
});
