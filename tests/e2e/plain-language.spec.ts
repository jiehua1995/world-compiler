import { expect, test } from '@playwright/test';

test('analyzes locally in the selected language and withholds scores for short text', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(`${request.url()} ${request.postData() ?? ''}`));
  await page.goto('./tools/plain-language/');
  await expect(page.getByLabel('分析语言')).toHaveValue('zh-CN');
  await page.getByLabel('待分析文本').fill('LOCAL_ONLY_SENTINEL 你好。');
  await expect(page.locator('[data-stat="sentenceCount"]')).toHaveText('1');
  await expect(page.locator('[data-stat="score"]')).toContainText('中文不提供');
  await page.getByLabel('分析语言').selectOption('en');
  await page.getByLabel('待分析文本').fill(Array(3).fill('The cat can see. A dog can run. We like the sun.').join(' '));
  await expect(page.locator('[data-stat="score"]')).toHaveText(/\d+\.\d/);
  expect(requests.join('\n')).not.toContain('LOCAL_ONLY_SENTINEL');
});
