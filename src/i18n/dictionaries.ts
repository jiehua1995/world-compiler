import type { Locale } from './types';

const zhCN = {
  'site.title': '世界编译局 / World Compiler',
  'site.description': '完全在浏览器本地运行的公益开源工具平台。',
  'a11y.skipToContent': '跳到主要内容',
  'language.label': '语言',
  'language.zh': '中文',
  'language.en': 'English',
  'theme.label': '主题',
  'theme.system': '跟随系统',
  'theme.light': '浅色',
  'theme.dark': '深色',
} as const;

export type DictionaryKey = keyof typeof zhCN;
export type Dictionary = Record<DictionaryKey, string>;

const en = {
  'site.title': 'World Compiler / 世界编译局',
  'site.description': 'A public-interest open-source toolkit that runs entirely in your browser.',
  'a11y.skipToContent': 'Skip to main content',
  'language.label': 'Language',
  'language.zh': '中文',
  'language.en': 'English',
  'theme.label': 'Theme',
  'theme.system': 'System',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
} satisfies Dictionary;

export const dictionaries: Record<Locale, Dictionary> = {
  'zh-CN': zhCN,
  en,
};

export function dictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
