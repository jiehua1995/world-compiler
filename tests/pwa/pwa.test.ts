import { afterEach, expect, test } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { buildPwa } from '../../scripts/build-pwa.mjs';

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))); });

test('base-aware manifest and static-only cache exclude OCR precache and user requests', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'world-compiler-pwa-'));
  directories.push(dir);
  await mkdir(join(dir, 'vendor'));
  await writeFile(join(dir, 'index.html'), '<html>shell</html>');
  await writeFile(join(dir, 'vendor/ocr.wasm'), 'ocr');
  const { manifest, worker, precache } = await buildPwa(dir, '/world-compiler');
  expect(manifest.start_url).toBe('/world-compiler/');
  expect(manifest.icons[0].src).toBe('/world-compiler/pwa-192.png');
  expect(precache).toContain('/world-compiler/');
  expect(precache).not.toContain('/world-compiler/vendor/ocr.wasm');
  expect(worker).not.toContain('skipWaiting');
  const handlers: Record<string, (event: unknown) => void> = {};
  runInNewContext(worker, { URL, self: { location: { origin: 'https://example.com' }, addEventListener: (name: string, fn: (event: unknown) => void) => { handlers[name] = fn; } } });
  for (const [url, method] of [
    ['https://example.com/world-compiler/?text=private', 'GET'],
    ['https://other.com/world-compiler/index.html', 'GET'],
    ['https://example.com/world-compiler/uploads/private.txt', 'GET'],
    ['https://example.com/world-compiler/index.html', 'POST'],
  ]) {
    handlers.fetch({ request: new Request(url, { method }), respondWith: () => { throw new Error('Private request intercepted'); } });
  }
});
