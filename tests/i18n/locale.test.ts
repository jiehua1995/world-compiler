// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { dictionary, dictionaries } from '../../src/i18n/dictionaries';
import { resolveLocale } from '../../src/i18n/locale';
import { createSafeStorage, initializePreferences } from '../../src/scripts/preferences';

describe('locale resolution', () => {
  it('defaults to Simplified Chinese without a supported preference', () => {
    expect(resolveLocale(null, ['fr-FR'])).toBe('zh-CN');
  });

  it('selects English from browser languages', () => {
    expect(resolveLocale(null, ['fr-FR', 'en-GB'])).toBe('en');
  });

  it('selects German from stored and browser locale tags', () => {
    expect(resolveLocale('de', ['en-US'])).toBe('de');
    expect(resolveLocale(null, ['de'])).toBe('de');
    expect(resolveLocale(null, ['de-DE'])).toBe('de');
  });

  it('gives a valid stored locale priority and ignores an invalid one', () => {
    expect(resolveLocale('zh-CN', ['en-US'])).toBe('zh-CN');
    expect(resolveLocale('pirate', ['en-US'])).toBe('en');
  });

  it('keeps all locale dictionary keys identical', () => {
    expect(Object.keys(dictionaries.en).sort()).toEqual(Object.keys(dictionaries['zh-CN']).sort());
    expect(Object.keys(dictionaries.de).sort()).toEqual(Object.keys(dictionaries['zh-CN']).sort());
    expect(dictionary('en')['site.title']).toContain('World Compiler');
  });
});

describe('safe preferences', () => {
  it('treats denied storage reads and writes as unavailable', () => {
    const storage = createSafeStorage({
      getItem: () => {
        throw new DOMException('Denied', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('Denied', 'SecurityError');
      },
    });

    expect(storage.get('locale')).toBeNull();
    expect(() => storage.set('locale', 'en')).not.toThrow();
  });

  it('initializes document language, translated text, and resolved theme', () => {
    document.body.innerHTML = '<span data-i18n="language.label"></span>';
    localStorage.setItem('world-compiler:locale', 'en');
    localStorage.setItem('world-compiler:theme', 'dark');

    const preferences = initializePreferences(document, window);

    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.querySelector('[data-i18n]')?.textContent).toBe('Language');
    preferences.destroy();
    localStorage.clear();
  });
});
