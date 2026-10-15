import { expect, test } from '@playwright/test';
import { tools } from '../../src/data/tools';

test('every route stays within phone viewport in all three languages', async ({page})=>{
  test.setTimeout(120000);
  await page.setViewportSize({width:390,height:844});
  for(const route of ['./','./about/','./tools/',...tools.map(tool=>`./tools/${tool.slug}/`)]){
    await page.goto(route);
    for(const lang of ['zh-CN','en','de']){
      await page.locator('[data-locale-select]').selectOption(lang);
      await expect(page.locator('h1')).toBeVisible();
      const width = await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));
      expect(width.document, `${route} ${lang} horizontal overflow`).toBeLessThanOrEqual(width.viewport);
    }
  }
});
