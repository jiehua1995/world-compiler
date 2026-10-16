import type { Locale, LocalizedText } from '../i18n/types';
import { extraTools } from './extra-tools';
import { nativeTools } from './native-tools';
import { mediaTools } from './media-tools';
import { proTools } from './pro-tools';

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
  glyph?: number;
}

export const tools: readonly ToolDefinition[] = [
  {
    slug: 'color-vision', category: 'vision', status: 'available', sequence: '001',
    asset: 'assets/instrument-glyphs/color-vision.png',
    title: { 'zh-CN': '色觉实验室', en: 'Color Vision Lab', de: 'Color Vision Lab' },
    summary: {
      'zh-CN': '导入图片、SVG 或 PDF 页面，对照不同色觉模式并导出模拟结果。',
      en: 'Import an image, SVG, or PDF page, compare color-vision modes, and export a simulation.',
      de: 'Bild, SVG oder PDF-Seite importieren, Farbsehmodi vergleichen und Simulationen exportieren.',
    },
    tags: { 'zh-CN': ['颜色', '视觉', '无障碍', '图片', 'SVG', 'PDF'], en: ['color', 'vision', 'accessibility', 'image', 'svg', 'pdf'], de: ['Farbe', 'Sehen', 'Barrierefreiheit', 'Bild', 'SVG', 'PDF'] },
  },
  {
    slug: 'contrast-lens', category: 'vision', status: 'available', sequence: '002', glyph: 20,
    title: { 'zh-CN': '对比度透镜', en: 'Contrast Lens', de: 'Kontrastlinse' },
    summary: { 'zh-CN': '逐对审查 2–12 个颜色令牌的 WCAG 对比度，并导出报告。', en: 'Audit WCAG contrast across 2–12 color tokens and export a report.', de: 'WCAG-Kontrast von 2–12 Farbwerten prüfen und Bericht exportieren.' },
    tags: { 'zh-CN': ['对比度', '界面'], en: ['contrast', 'interface'], de: ['Kontrast', 'Oberfläche'] },
  },
  {
    slug: 'plain-language', category: 'text', status: 'available', sequence: '003', glyph: 16,
    title: { 'zh-CN': '清晰语言仪', en: 'Plain Language Meter', de: 'Klartext-Meter' },
    summary: { 'zh-CN': '发现复杂表达，帮助公共信息更容易理解。', en: 'Find dense wording and make public information easier to understand.', de: 'Komplexe Formulierungen erkennen und öffentliche Informationen verständlicher machen.' },
    tags: { 'zh-CN': ['文本', '可读性'], en: ['text', 'readability'], de: ['Text', 'Lesbarkeit'] },
  },
  {
    slug: 'data-shape', category: 'data', status: 'available', sequence: '004', glyph: 15,
    title: { 'zh-CN': '数据塑形台', en: 'Data Shaper', de: 'Datenformer' },
    summary: { 'zh-CN': '在本地整理轻量表格并检查常见结构问题。', en: 'Reshape small tables locally and inspect common structural issues.', de: 'Kleine Tabellen lokal bereinigen und auf typische Strukturprobleme prüfen.' },
    tags: { 'zh-CN': ['数据', '表格'], en: ['data', 'table'], de: ['Daten', 'Tabelle'] },
  },
  ...extraTools,
  ...nativeTools,
  ...mediaTools,
  ...proTools.filter((tool) => tool.slug !== 'markdown-table' && tool.slug !== 'text-format'),
];
