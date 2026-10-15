import type { Locale } from './types';

const supportedLocales: readonly Locale[] = ['zh-CN', 'en', 'de'];

export function resolveLocale(
  stored: string | null,
  browserLanguages: readonly string[],
): Locale {
  if (supportedLocales.includes(stored as Locale)) return stored as Locale;

  for (const value of browserLanguages) {
    const language = value.toLowerCase();
    if (language.startsWith('de')) return 'de';
    if (language.startsWith('en')) return 'en';
  }
  return 'zh-CN';
}
