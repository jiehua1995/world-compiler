import type { Locale } from './types';

const supportedLocales: readonly Locale[] = ['zh-CN', 'en'];

export function resolveLocale(
  stored: string | null,
  browserLanguages: readonly string[],
): Locale {
  if (supportedLocales.includes(stored as Locale)) return stored as Locale;

  return browserLanguages.some((language) => language.toLowerCase().startsWith('en'))
    ? 'en'
    : 'zh-CN';
}
