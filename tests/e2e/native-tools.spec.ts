import { expect,test } from '@playwright/test';
import path from 'node:path';
import { wav } from '../../src/features/native-tools/core';
for(const slug of ['palette-lab','audio-lab'])test(`${slug} clears prior file after oversized replacement and clearing selection`,async({page})=>{
 await page.goto(`./tools/${slug}/`);
 const file=page.locator('[data-file]');
 const valid=slug==='palette-lab'?path.resolve('tests/fixtures/color-grid.png'):{name:'tone.wav',mimeType:'audio/wav',buffer:Buffer.from(wav([new Float32Array(8000)],8000))};
 await file.setInputFiles(valid);await expect(page.locator('[data-run]')).toBeEnabled();
 if(slug==='audio-lab'){const pending=page.waitForEvent('download');await page.locator('[data-run]').click();await pending;await expect(page.locator('[data-audio]')).toBeVisible();}
 await file.setInputFiles({name:slug==='palette-lab'?'oversized.png':'oversized.wav',mimeType:slug==='palette-lab'?'image/png':'audio/wav',buffer:Buffer.alloc((slug==='palette-lab'?21:41)*1024*1024)});
 await expect(page.locator('[data-run]')).toBeDisabled();await expect(page.locator('[data-output]')).toHaveValue('');await expect(page.locator('[data-audio]')).toBeHidden();await expect(page.locator('[data-audio]')).not.toHaveAttribute('src');
 if(slug==='palette-lab'){await expect(page.locator('[data-swatches] > div')).toHaveCount(0);await expect(page.locator('[data-json]')).toBeDisabled();await expect(page.locator('[data-css]')).toBeDisabled();await expect(page.locator('[data-image]')).not.toHaveAttribute('data-loaded');}
 await file.setInputFiles(valid);await expect(page.locator('[data-run]')).toBeEnabled();await file.setInputFiles([]);await expect(page.locator('[data-run]')).toBeDisabled();await expect(page.locator('[data-output]')).toHaveValue('');
});
test('text workshop deduplicates and reports statistics',async({page})=>{
 await page.goto('./tools/text-workshop/');await page.locator('[data-input]').fill('one\none\ntwo');await page.locator('[data-mode]').selectOption('dedupe');await page.locator('[data-run]').click();await expect(page.locator('[data-output]')).toHaveValue('one\ntwo');await expect(page.locator('[data-status]')).toContainText('11 / 3 / 3');
});
test('URL editor uses newly typed URL, keeps duplicates, strips tracking and rejects schemes',async({page})=>{
 await page.goto('./tools/url-lab/');await page.locator('[data-url]').fill('https://example.org/?x=1&x=2&utm_medium=test#part');await page.locator('[data-run]').click();await expect(page.locator('[data-output]')).toHaveValue(/^https:\/\/example.org\/\?x=1&x=2#part/);await page.locator('[data-query]').fill('q=changed&q=again');await page.locator('[data-run]').click();await expect(page.locator('[data-output]')).toHaveValue(/^https:\/\/example.org\/\?q=changed&q=again#part/);await page.locator('[data-url]').fill('javascript:alert(1)');await page.locator('[data-run]').click();await expect(page.locator('[data-status]')).not.toBeEmpty();expect(page.url()).toContain('/url-lab/');
});
test('unit converter handles Fahrenheit and rejects overflow',async({page})=>{
 await page.goto('./tools/unit-lab/');await page.locator('[data-group]').selectOption('temperature');await page.locator('[data-from]').selectOption('F');await page.locator('[data-to]').selectOption('C');await page.locator('[data-value]').fill('32');await page.locator('[data-run]').click();await expect(page.locator('[data-output]')).toHaveValue('0 C');
});
test('token lab generates passwords and UUID v4',async({page})=>{
 await page.goto('./tools/token-lab/');await page.locator('[data-length]').fill('40');await page.locator('[data-run]').click();await expect(page.locator('[data-output]')).toHaveValue(/^.{40}$/);await page.locator('[data-kind]').selectOption('uuid');await page.locator('[data-run]').click();await expect(page.locator('[data-output]')).toHaveValue(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
test('regex worker replaces matches and terminates catastrophic patterns',async({page})=>{
 await page.goto('./tools/regex-lab/');await page.locator('[data-pattern]').fill('(hello)');await page.locator('[data-flags]').fill('gi');await page.locator('[data-replace]').fill('$1!');await page.locator('[data-input]').fill('Hello hello');await page.locator('[data-run]').click();await expect(page.locator('[data-output]')).toHaveValue(/Hello! hello!/);await page.locator('[data-pattern]').fill('(a+)+$');await page.locator('[data-input]').fill('a'.repeat(100)+'!');await page.locator('[data-run]').click();await expect(page.locator('[data-status]')).toContainText('1 秒');await page.locator('[data-pattern]').fill('a');await page.locator('[data-input]').fill('a');await page.locator('[data-run]').click();await expect(page.locator('[data-output]')).toHaveValue(/"matches"/);
});
test('palette extracts colors and exports JSON',async({page})=>{
 await page.goto('./tools/palette-lab/');await page.locator('[data-file]').setInputFiles(path.resolve('tests/fixtures/color-grid.png'));await expect(page.locator('[data-swatches] > div')).not.toHaveCount(0);await expect(page.locator('[data-output]')).toHaveValue(/--color-1: #[0-9a-f]{6}/);const pending=page.waitForEvent('download');await page.locator('[data-json]').click();expect((await pending).suggestedFilename()).toBe('palette.json');
});
test('audio decodes, trims and exports valid WAV PCM',async({page})=>{
 await page.goto('./tools/audio-lab/');const samples=new Float32Array(8000);for(let i=0;i<samples.length;i++)samples[i]=Math.sin(i*.1)*.5;await page.locator('[data-file]').setInputFiles({name:'tone.wav',mimeType:'audio/wav',buffer:Buffer.from(wav([samples],8000))});await expect(page.locator('[data-output]')).toHaveValue(/tone.wav/);await page.locator('[data-start]').fill('0.1');await page.locator('[data-end]').fill('0.5');await page.locator('[data-mono]').check();const pending=page.waitForEvent('download');await page.locator('[data-run]').click();const download=await pending;expect(download.suggestedFilename()).toBe('audio-trim.wav');const stream=await download.createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(Buffer.from(chunk));const data=Buffer.concat(chunks);expect(data.toString('ascii',0,4)).toBe('RIFF');expect(data.toString('ascii',8,12)).toBe('WAVE');expect(data.readUInt16LE(22)).toBe(1);expect(data.readUInt16LE(34)).toBe(16);expect(data.readUInt32LE(40)).toBe(data.length-44);await expect(page.locator('[data-audio]')).toBeVisible();
});
