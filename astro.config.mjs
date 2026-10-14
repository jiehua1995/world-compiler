import { defineConfig } from 'astro/config';

function normalizeBasePath(value) {
  const trimmed = value.trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}` : '/';
}

const base = normalizeBasePath(process.env.PUBLIC_BASE_PATH ?? '/world-compiler');
const site = process.env.PUBLIC_SITE_URL?.trim();

export { normalizeBasePath };

export default defineConfig({
  output: 'static',
  base,
  ...(site ? { site } : {}),
});
