import { dictionary, type DictionaryKey } from '../i18n/dictionaries';
import { resolveLocale } from '../i18n/locale';
import type { Locale } from '../i18n/types';
import {
  resolveTheme,
  resolveThemePreference,
  type ThemePreference,
} from '../theme/theme';

const localeKey = 'world-compiler:locale';
const themeKey = 'world-compiler:theme';

type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;

export interface SafeStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export function createSafeStorage(storage: StorageAccess | null): SafeStorage {
  return {
    get(key) {
      try {
        return storage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        storage?.setItem(key, value);
      } catch {
        // Preferences remain usable for this page even when persistence is denied.
      }
    },
  };
}

function storageFrom(win: Window): StorageAccess | null {
  try {
    return win.localStorage;
  } catch {
    return null;
  }
}

function translateDocument(doc: Document, locale: Locale): void {
  const copy = dictionary(locale);
  doc.documentElement.lang = locale;
  doc.title = copy['site.title'];

  const description = doc.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (description) description.content = copy['site.description'];

  doc.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n as DictionaryKey | undefined;
    if (key && key in copy) element.textContent = copy[key];
  });

  doc.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((element) => {
    const key = element.dataset.i18nPlaceholder as DictionaryKey | undefined;
    if (key && key in copy) element.placeholder = copy[key];
  });

  doc.querySelectorAll<HTMLElement>('[data-label-zh][data-label-en]').forEach((element) => {
    element.setAttribute(
      'aria-label',
      locale === 'en' ? element.dataset.labelEn ?? '' : element.dataset.labelZh ?? '',
    );
  });

  doc.querySelectorAll<HTMLElement>('[data-locale]').forEach((control) => {
    control.setAttribute('aria-pressed', String(control.dataset.locale === locale));
  });
}

export function initializePreferences(doc: Document, win: Window) {
  const storage = createSafeStorage(storageFrom(win));
  const media = win.matchMedia?.('(prefers-color-scheme: dark)');
  let locale = resolveLocale(storage.get(localeKey), win.navigator.languages);
  let themePreference = resolveThemePreference(storage.get(themeKey));

  const applyTheme = () => {
    doc.documentElement.dataset.theme = resolveTheme(themePreference, media?.matches ?? false);
    doc.documentElement.dataset.themePreference = themePreference;
    doc.querySelectorAll<HTMLElement>('[data-theme-value]').forEach((control) => {
      control.setAttribute(
        'aria-pressed',
        String(control.dataset.themeValue === themePreference),
      );
    });
  };

  const onSystemThemeChange = () => {
    if (themePreference === 'system') applyTheme();
  };

  translateDocument(doc, locale);
  applyTheme();
  media?.addEventListener?.('change', onSystemThemeChange);

  return {
    setLocale(nextLocale: Locale) {
      locale = nextLocale;
      storage.set(localeKey, locale);
      translateDocument(doc, locale);
      doc.dispatchEvent(new CustomEvent('worldcompiler:localechange', { detail: { locale } }));
    },
    setTheme(nextTheme: ThemePreference) {
      themePreference = nextTheme;
      storage.set(themeKey, themePreference);
      applyTheme();
    },
    destroy() {
      media?.removeEventListener?.('change', onSystemThemeChange);
    },
  };
}
