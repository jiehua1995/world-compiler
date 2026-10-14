import { afterEach, describe, expect, it, vi } from 'vitest';

const originalBasePath = process.env.PUBLIC_BASE_PATH;

afterEach(() => {
  if (originalBasePath === undefined) {
    delete process.env.PUBLIC_BASE_PATH;
  } else {
    process.env.PUBLIC_BASE_PATH = originalBasePath;
  }
  vi.resetModules();
});

describe('Astro deployment configuration', () => {
  it('builds statically under a normalized project base path', async () => {
    process.env.PUBLIC_BASE_PATH = 'world-compiler/';

    const { default: config } = await import('../../astro.config.mjs');

    expect(config.output).toBe('static');
    expect(config.base).toBe('/world-compiler');
  });
});
