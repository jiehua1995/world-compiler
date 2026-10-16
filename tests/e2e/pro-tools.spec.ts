import { expect, test } from '@playwright/test';
import path from 'node:path';
import { tools } from '../../src/data/tools';
import { proTools } from '../../src/data/pro-tools';

test('all twenty-seven new tool routes have localized pages, unique icons and working controls', async ({page}) => {
 expect(proTools).toHaveLength(27);
 await page.goto('./tools/');
 await expect(page.getByRole('article')).toHaveCount(tools.length);
 for (const tool of proTools) {
  await page.goto(`./tools/${tool.slug}/`);
  if(tool.slug==='text-format') await expect(page.locator('[data-text-studio]')).toBeVisible();
  else await expect(page.locator(`[data-pro-lab="${tool.slug}"]`)).toBeVisible();
  await expect(page.locator('.instrument-identity .instrument-glyph--vector')).toHaveCount(0);
  await expect(page.locator('.instrument-identity .instrument-glyph')).toBeVisible();
  await expect(page.locator('.workbench-hero h1')).toHaveText(tool.title['zh-CN']);
  if (tool.slug.startsWith('markdown-')) await expect(page.locator('[data-markdown-editor]')).toBeVisible();
  else await expect(page.locator('[data-run]')).toBeEnabled();
 }
});
test('professional tool icons reuse distinct full-color artwork from the instrument sheet', async ({page}) => {
 const positions = new Set<string>();
 for (const tool of proTools) {
  await page.goto(`./tools/${tool.slug}/`);
  const glyph = page.locator('.instrument-identity .instrument-glyph--vector');
  const artwork = page.locator('.instrument-identity .instrument-glyph:not(.instrument-glyph--vector)');
  await expect(glyph).toHaveCount(0);
  await expect(artwork).toBeVisible();
  expect(await artwork.evaluate((node) => getComputedStyle(node, '::after').backgroundImage)).toContain('contact-sheet.png');
  positions.add(await artwork.evaluate((node) => getComputedStyle(node, '::after').backgroundPosition));
 }
 expect(positions.size).toBe(proTools.length);
});
test('new data tools generate schema, query JSON, convert bases, inspect Unicode, profile CSV and check robots rules', async ({page}) => {
 await page.goto('./tools/json-schema/'); await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/"required": \[\n\s+"id"/);
 await page.goto('./tools/jsonpath-query/'); await page.locator('[data-run]').click(); await expect(page.locator('[data-output]')).toHaveValue('[\n  1,\n  2\n]');
 await page.goto('./tools/base-converter/'); await page.locator('[data-run]').click(); await expect(page.locator('[data-output]')).toHaveValue(/Binary: 11111111/);
 await page.goto('./tools/unicode-inspector/'); await page.locator('[data-run]').click(); await expect(page.locator('[data-output]')).toHaveValue(/"utf8Bytes": 19/);
 await page.goto('./tools/csv-profiler/'); await page.locator('[data-run]').click(); await expect(page.locator('[data-output]')).toHaveValue(/"missing": 1/);
 await page.goto('./tools/robots-checker/'); await page.locator('[data-run]').click(); await expect(page.locator('[data-output]')).toHaveValue(/"directives": 2/);
});
test('random forge creates unique lottery draws and multilingual greetings', async ({page}) => {
 await page.goto('./tools/random-forge/');
 await page.locator('[data-mode]').selectOption('lottery');
 await page.locator('[data-count]').fill('7');
 await page.locator('[data-run]').click();
 const numbers=(await page.locator('[data-output]').inputValue()).split('\n');
 expect(new Set(numbers).size).toBe(7);
 expect(numbers.every((n)=>Number(n)>=1&&Number(n)<=49)).toBe(true);
 await page.locator('[data-mode]').selectOption('greeting');
 await page.getByRole('combobox',{name:'语言',exact:true}).selectOption('de');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/Möge/);
});

test('YAML converter round-trips structured settings and rejects malformed input', async ({page}) => {
 await page.goto('./tools/yaml-json/');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/"local": true/);
 await page.locator('[data-mode]').selectOption('json-yaml');
 await page.locator('[data-input]').fill('{"active":true,"items":[1,2]}');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/active: true/);
 await page.locator('[data-input]').fill('broken: [');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toBeEmpty();
 await expect(page.locator('[data-status]')).not.toBeEmpty();
});

test('CSV to JSON preserves quoted delimiters and legacy markdown table URL opens the merged editor', async ({page}) => {
 await page.goto('./tools/csv-json/');
 await page.locator('[data-input]').fill('name,note\nAda,"hello, world"');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/hello, world/);
 await page.goto('./tools/markdown-table/');
 await expect(page.locator('[data-markdown-editor]')).toBeVisible();
 await page.locator('[data-table-input]').fill('name,note\nAda,a|b');
 await page.locator('[data-table-insert]').click();
 await expect(page.locator('[data-markdown-editor]')).toHaveValue(/a\\\|b/);
});

test('Markdown Studio renders safely, updates live, and jumps diagnostics to their source line', async ({page}) => {
 await page.goto('./tools/markdown-studio/');
 const editor=page.locator('[data-markdown-editor]');
 await editor.fill('# Guide\n\n### Skipped\n\n<script>window.__xss = true</script>\n\n![](https://example.org/photo.png)\n[relative](./page)');
 await expect(page.locator('[data-markdown-preview] h1')).toHaveText('Guide');
 await expect(page.locator('[data-markdown-preview] script')).toHaveCount(0);
 await expect(page.locator('[data-markdown-preview] img')).toHaveCount(0);
 expect(await page.evaluate(() => (window as Window & {__xss?:boolean}).__xss)).toBeUndefined();
 await page.locator('[data-markdown-issue="heading-jump"]').click();
 await expect(editor).toBeFocused();
 expect(await editor.evaluate((node: HTMLTextAreaElement) => node.selectionStart)).toBe(9);
 await expect(page.locator('[data-markdown-issue="missing-image-alt"]')).toBeVisible();
 await page.locator('[data-locale-select]').selectOption('de');
 await expect(page.getByRole('button',{name:/Überschriften überspringen/})).toBeVisible();
 const download=page.waitForEvent('download');
 await page.locator('[data-markdown-download]').click();
 expect((await download).suggestedFilename()).toBe('document.md');
});

test('Markdown Studio inserts formatting and a parsed table at the caret and supports mobile view tabs', async ({page}) => {
 await page.goto('./tools/markdown-table/');
 const editor=page.locator('[data-markdown-editor]');
 await editor.fill('');
 await editor.evaluate((node: HTMLTextAreaElement) => node.focus());
 await page.locator('[data-md-action="bold"]').click();
 await expect(editor).toHaveValue('**文本**');
 await editor.fill('');
 await page.locator('[data-table-input]').fill('name,note\nAda,"a|b, c"');
 await page.locator('[data-table-insert]').click();
 await expect(editor).toHaveValue(/Ada \| a\\\|b, c/);
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-mobile-tab="preview"]').click();
 await expect(page.locator('[data-markdown-preview]')).toBeVisible();
 await expect(page.locator('[data-markdown-editor]')).toBeHidden();
});

test('CSV export escapes formula cells by default and clears stale downloads on edits', async ({page}) => {
 await page.goto('./tools/csv-json/');
 await page.locator('[data-mode]').selectOption('json-csv');
 await page.locator('[data-input]').fill('[{"name":"=1+1"}]');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/'=1\+1/);
 await page.locator('[data-formula-safe]').uncheck();
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/=1\+1/);
 await page.locator('[data-input]').fill('[{"name":"changed"}]');
 await expect(page.locator('[data-output]')).toBeEmpty();
 await expect(page.locator('[data-download]')).toBeDisabled();
});

test('subnet and cron planners produce bounded, deterministic calculations', async ({page}) => {
 await page.goto('./tools/subnet-calculator/');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/192\.168\.1\.255/);
 await page.locator('[data-input]').fill('999.0.0.1/24');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-status]')).not.toBeEmpty();
 await page.goto('./tools/cron-planner/');
 await page.locator('[data-input]').fill('not cron');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toBeEmpty();
});

test('hash studio computes standard SHA-256 and image tools export correctly', async ({page}) => {
 await page.goto('./tools/hash-studio/');
 await page.locator('[data-input]').fill('abc');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad/);
 await page.goto('./tools/image-converter/');
 await page.locator('[data-file]').setInputFiles(path.resolve('tests/fixtures/color-grid.png'));
 await page.locator('[data-format]').selectOption('image/webp');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/image\/webp/);
 const download=page.waitForEvent('download');
 await page.locator('[data-download]').click();
 expect((await download).suggestedFilename()).toBe('converted.webp');
});

test('SVG optimizer strips active content while retaining local vector graphics', async ({page}) => {
 await page.goto('./tools/svg-optimizer/');
 await page.locator('[data-input]').fill('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><script>alert(1)</script><circle cx="10" cy="10" r="5" onclick="alert(2)"/></svg>');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).not.toHaveValue(/<script>/);
 await expect(page.locator('[data-output]')).not.toHaveValue(/onclick/);
 await expect(page.locator('[data-output]')).toHaveValue(/<circle/);
});

test('XML blocks entity declarations and CSS workbench normalizes real rules', async ({page}) => {
 await page.goto('./tools/xml-studio/');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/<item id="1">Example<\/item>/);
 await page.locator('[data-input]').fill('<!DOCTYPE x [<!ENTITY e SYSTEM "https://example.org/">]><x>&e;</x>');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-status]')).not.toBeEmpty();
 await page.goto('./tools/css-studio/');
 await page.locator('[data-mode]').selectOption('minify');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/\.card\s*\{/);
});

test('color and gradient tools preview the computed output and export CSS', async ({page}) => {
 await page.goto('./tools/color-converter/');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/"hsl": "hsl\(/);
 await expect(page.locator('[data-preview]')).toBeVisible();
 await page.goto('./tools/gradient-studio/');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/linear-gradient\(135deg/);
 await expect(page.locator('[data-preview]')).toBeVisible();
});

test('date math, UUID, and text formatter handle valid and invalid inputs', async ({page}) => {
 await page.goto('./tools/date-math/');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/2026-11-14/);
 await page.goto('./tools/uuid-studio/');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/UUID (version|版本) 4/i);
 await page.goto('./tools/text-format/');
 await page.locator('[data-text-input]').fill('  Café & WORLD  ');
 await page.getByLabel('生成 URL slug').check();
 await page.locator('[data-text-run]').click();
 await expect(page.locator('[data-text-output]')).toHaveValue('cafe-world');
});

test('legacy formatter route opens Text Studio with operation history and source preservation', async ({page}) => {
 await page.goto('./tools/text-format/');
 const source=page.locator('[data-text-input]');
 await source.fill('Café\nCafé\nWorld');
 await page.getByLabel('删除重复行').check();
 await page.locator('[data-text-run]').click();
 await expect(page.locator('[data-text-output]')).toHaveValue('Café\nWorld');
 await page.getByLabel('生成 URL slug').check();
 await page.locator('[data-text-run]').click();
 await expect(page.locator('[data-text-output]')).toHaveValue('cafe-world');
 await expect(source).toHaveValue('Café\nCafé\nWorld');
 await page.locator('[data-text-undo]').click();
 await expect(page.locator('[data-text-output]')).toHaveValue('Café\nWorld');
 await page.locator('[data-text-redo]').click();
 await expect(page.locator('[data-text-output]')).toHaveValue('cafe-world');
});

test('Text Studio distinguishes an intentionally empty result from no result', async ({page}) => {
 await page.goto('./tools/text-workshop/');
 await page.locator('[data-text-input]').fill('!!!');
 await page.getByLabel('生成 URL slug').check();
 await page.locator('[data-text-run]').click();
 await expect(page.locator('[data-text-before]')).toHaveText('!!!');
 await expect(page.locator('[data-text-after]')).toHaveText('');
 await expect(page.locator('[data-text-stats]')).toContainText('→ 0 · 0 B · 0 · 0');
});

test('favicon generator downloads its vector icon and metadata reports browser-readable facts', async ({page}) => {
 await page.goto('./tools/favicon-studio/');
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-preview] img')).toBeVisible();
 const download=page.waitForEvent('download');
 await page.locator('[data-download]').click();
 expect((await download).suggestedFilename()).toBe('favicon.svg');
 await page.goto('./tools/image-metadata/');
 await page.locator('[data-file]').setInputFiles(path.resolve('tests/fixtures/color-grid.png'));
 await page.locator('[data-run]').click();
 await expect(page.locator('[data-output]')).toHaveValue(/\d+ × \d+ px/);
});
