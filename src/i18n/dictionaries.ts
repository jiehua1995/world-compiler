import type { Locale } from './types';

const zhCN = {
  'site.title': '世界编译局 / World Compiler',
  'site.description': '完全在浏览器本地运行的公益开源工具平台。',
  'site.name': '世界编译局',
  'site.nameEn': 'World Compiler',
  'site.tagline': '公共工具观测站',
  'a11y.skipToContent': '跳到主要内容',
  'language.label': '语言',
  'language.zh': '中文',
  'language.en': 'English',
  'theme.label': '主题',
  'theme.system': '跟随系统',
  'theme.light': '浅色',
  'theme.dark': '深色',
  'nav.home': '首页',
  'nav.tools': '工具目录',
  'nav.about': '关于计划',
  'status.local': '本地运算',
  'footer.mission': '让复杂工具成为每个人都能使用的公共基础设施。',
  'footer.openSource': '公益 · 开源 · 本地优先',
  'home.eyebrow': 'WC / 公共工具协议 001',
  'home.heading': '把复杂世界，编译成可用工具。',
  'home.intro': '无需登录，也不上传你的数据。世界编译局把专业能力封装成清晰、可信、在浏览器本地运行的工具。',
  'home.signal': '首个工具正在接入',
} as const;

export type DictionaryKey = keyof typeof zhCN;
export type Dictionary = Record<DictionaryKey, string>;

const en = {
  'site.title': 'World Compiler / 世界编译局',
  'site.description': 'A public-interest open-source toolkit that runs entirely in your browser.',
  'site.name': 'World Compiler',
  'site.nameEn': '世界编译局',
  'site.tagline': 'Public Tool Observatory',
  'a11y.skipToContent': 'Skip to main content',
  'language.label': 'Language',
  'language.zh': '中文',
  'language.en': 'English',
  'theme.label': 'Theme',
  'theme.system': 'System',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'nav.home': 'Home',
  'nav.tools': 'Tool index',
  'nav.about': 'About',
  'status.local': 'Local compute',
  'footer.mission': 'Turning complex capabilities into public infrastructure everyone can use.',
  'footer.openSource': 'Public-interest · Open source · Local first',
  'home.eyebrow': 'WC / PUBLIC TOOL PROTOCOL 001',
  'home.heading': 'Compile a complex world into useful tools.',
  'home.intro': 'No account and no data upload. World Compiler packages specialist capabilities into clear, trustworthy tools that run locally in your browser.',
  'home.signal': 'First instrument connecting',
} satisfies Dictionary;

export const dictionaries: Record<Locale, Dictionary> = {
  'zh-CN': zhCN,
  en,
};

export function dictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
