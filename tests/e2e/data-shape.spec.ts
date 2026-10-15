import { expect, test } from '@playwright/test';

test('imports locally, previews, cleans, and downloads CSV', async ({ page }) => {
  await page.goto('./tools/data-shape/');
  await page.getByLabel('选择 CSV 或 TSV 文件').setInputFiles({ name: 'table.csv', mimeType: 'text/csv', buffer: Buffer.from('name,note\r\n  Ada  ,"hello, table"\r\n , \r\n') });
  await expect(page.getByRole('status')).toContainText('表格已读取');
  await expect(page.locator('[data-data-table] tr')).toHaveCount(3);
  await page.getByRole('button', { name: '清理单元格并移除空白行' }).click();
  await expect(page.locator('[data-data-table] tr')).toHaveCount(2);
  await expect(page.locator('[data-data-table]')).toContainText('Ada');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载整理后的 CSV' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('world-compiler-cleaned.csv');
});

test('rejects malformed and oversized files without losing an operable picker', async ({ page }) => {
  await page.goto('./tools/data-shape/');
  const input = page.getByLabel('选择 CSV 或 TSV 文件');
  await input.setInputFiles({ name: 'broken.csv', mimeType: 'text/csv', buffer: Buffer.from('a,"not closed') });
  await expect(page.getByRole('alert')).toContainText('无法解析');
  await input.setInputFiles({ name: 'large.csv', mimeType: 'text/csv', buffer: Buffer.alloc(10_000_001) });
  await expect(page.getByRole('alert')).toContainText('超过 10 MB');
  await expect(input).toBeEnabled();
});
