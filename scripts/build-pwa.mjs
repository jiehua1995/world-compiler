import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import config from '../astro.config.mjs';

export async function buildPwa(directory = fileURLToPath(new URL('../dist/', import.meta.url)), base = config.base) {
  const root = `${base === '/' ? '' : base.replace(/\/$/, '')}/`;
  const files = [];
  async function walk(dir, prefix = '') {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const name = prefix + entry.name;
      if (entry.isDirectory()) await walk(`${dir}/${entry.name}`, `${name}/`);
      else if (!['sw.js', 'manifest.webmanifest'].includes(name)) files.push(name);
    }
  }
  await walk(directory);
  const urls = files.map((name) => root + name);
  const precache = [];
  const hash = createHash('sha256');
  for (const name of files.sort()) {
    hash.update(name).update(await readFile(`${directory}/${name}`));
    if (!name.startsWith('vendor/') && /\.(html|js|mjs|css|svg|png|woff2?)$/.test(name) && (await stat(`${directory}/${name}`)).size < 1_500_000) {
      precache.push(root + name);
      if (name.endsWith('index.html')) {
        const route = root + name.slice(0, -10);
        precache.push(route);
        if (route !== '/') precache.push(route.slice(0, -1));
      }
    }
  }
  const manifest = { id: root, name: 'World Compiler', short_name: 'World Compiler', start_url: root, scope: root, display: 'standalone', background_color: '#f3f0e8', theme_color: '#f3f0e8', icons: [192, 512].map((size) => ({ src: `${root}pwa-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any maskable' })) };
  const worker = `// Generated static asset allowlist. Never store submitted files or query content.
const CACHE = ${JSON.stringify(`world-compiler:${root}:${hash.digest('hex').slice(0, 16)}`)};
const PREFIX = ${JSON.stringify(`world-compiler:${root}:`)};
const PRECACHE = ${JSON.stringify([...new Set(precache)])};
const ALLOWED = new Set(${JSON.stringify([...new Set([...urls, ...precache])])});
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE))));
// Wait for open tabs to close before activating an update; never reload open editors.
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search || request.headers.has('authorization') || !ALLOWED.has(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(request);
    if (hit) return hit;
    const response = await fetch(request);
    if (response.ok && !response.redirected && response.type === 'basic') {
      try { await cache.put(request, response.clone()); } catch { /* Storage quota must not break the online tool. */ }
    }
    return response;
  }));
});
`;
  await writeFile(`${directory}/manifest.webmanifest`, JSON.stringify(manifest, null, 2));
  await writeFile(`${directory}/sw.js`, worker);
  return { manifest, worker, precache };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await buildPwa();
