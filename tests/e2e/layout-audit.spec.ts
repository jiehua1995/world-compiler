import { expect, test } from '@playwright/test';
import { tools } from '../../src/data/tools';

test('every route stays within phone viewport in all three languages', async ({page})=>{
  test.setTimeout(120000);
  await page.setViewportSize({width:390,height:844});
  for(const route of ['./','./about/','./tools/',...tools.map(tool=>`./tools/${tool.slug}/`)]){
    await page.goto(route);
    for(const lang of ['zh-CN','en','de']){
      await page.locator('[data-locale-select]').selectOption(lang);
      await expect(page.locator('h1').first()).toBeVisible();
      const width = await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth).map(e=>({tag:e.tagName,class:String(e.className),text:e.textContent?.slice(0,100),right:e.getBoundingClientRect().right}))}));
      expect(width.document, `${route} ${lang} horizontal overflow: ${JSON.stringify(width.offenders)}`).toBeLessThanOrEqual(width.viewport);
    }
  }
});
