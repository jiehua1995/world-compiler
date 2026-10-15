import type { Locale, LocalizedText } from '../i18n/types';

export type ToolCategory = 'vision' | 'text' | 'data' | 'media';
export type ToolStatus = 'available' | 'planned';

export interface ToolDefinition {
  slug: string;
  category: ToolCategory;
  status: ToolStatus;
  title: LocalizedText;
  summary: LocalizedText;
  tags: Record<Locale, string[]>;
  sequence?: string;
  asset?: string;
}

export const tools: readonly ToolDefinition[] = [
  {
    slug: 'color-vision', category: 'vision', status: 'available', sequence: '001',
    asset: 'assets/instrument-glyphs/color-vision.png',
    title: { 'zh-CN': '色觉实验室', en: 'Color Vision Lab', de: 'Color Vision Lab' },
    summary: {
      'zh-CN': '在本地导入图片，对照不同色觉模式并导出模拟结果。',
      en: 'Import an image locally, compare color-vision modes, and export a simulation.',
      de: 'Bild lokal importieren, Farbsehmodi vergleichen und eine Simulation exportieren.',
    },
    tags: { 'zh-CN': ['颜色', '视觉', '无障碍', '图片'], en: ['color', 'vision', 'accessibility', 'image'], de: ['Farbe', 'Sehen', 'Barrierefreiheit', 'Bild'] },
  },
  {
    slug: 'contrast-lens', category: 'vision', status: 'planned', sequence: '002',
    title: { 'zh-CN': '对比度透镜', en: 'Contrast Lens', de: 'Kontrastlinse' },
    summary: { 'zh-CN': '检查界面颜色组合与文字可读性。', en: 'Inspect interface color pairs and text readability.', de: 'Farbkombinationen und Lesbarkeit von Text prüfen.' },
    tags: { 'zh-CN': ['对比度', '界面'], en: ['contrast', 'interface'], de: ['Kontrast', 'Oberfläche'] },
  },
  {
    slug: 'plain-language', category: 'text', status: 'planned', sequence: '003',
    title: { 'zh-CN': '清晰语言仪', en: 'Plain Language Meter', de: 'Klartext-Meter' },
    summary: { 'zh-CN': '发现复杂表达，帮助公共信息更容易理解。', en: 'Find dense wording and make public information easier to understand.', de: 'Komplexe Formulierungen erkennen und öffentliche Informationen verständlicher machen.' },
    tags: { 'zh-CN': ['文本', '可读性'], en: ['text', 'readability'], de: ['Text', 'Lesbarkeit'] },
  },
  {
    slug: 'data-shape', category: 'data', status: 'planned', sequence: '004',
    title: { 'zh-CN': '数据塑形台', en: 'Data Shaper', de: 'Datenformer' },
    summary: { 'zh-CN': '在本地整理轻量表格并检查常见结构问题。', en: 'Reshape small tables locally and inspect common structural issues.', de: 'Kleine Tabellen lokal bereinigen und auf typische Strukturprobleme prüfen.' },
    tags: { 'zh-CN': ['数据', '表格'], en: ['data', 'table'], de: ['Daten', 'Tabelle'] },
  },
];
