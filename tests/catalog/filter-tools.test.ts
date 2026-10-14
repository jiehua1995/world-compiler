import { describe, expect, it } from 'vitest';
import type { ToolDefinition } from '../../src/data/tools';
import { filterTools } from '../../src/features/catalog/filter-tools';

const fixtures: ToolDefinition[] = [
  {
    slug: 'color-vision',
    category: 'vision',
    status: 'available',
    title: { 'zh-CN': '色觉实验室', en: 'Color Vision Lab' },
    summary: { 'zh-CN': '模拟不同色觉模式', en: 'Compare color perception modes' },
    tags: { 'zh-CN': ['颜色', '无障碍'], en: ['color', 'accessibility'] },
  },
  {
    slug: 'readability',
    category: 'text',
    status: 'planned',
    title: { 'zh-CN': '可读性检查', en: 'Readability Check' },
    summary: { 'zh-CN': '分析文本结构', en: 'Analyze text structure' },
    tags: { 'zh-CN': ['文本'], en: ['writing'] },
  },
];

describe('filterTools', () => {
  it('matches English text without case or surrounding whitespace', () => {
    expect(filterTools(fixtures, '  COLOR VISION  ', 'all', 'en').map((tool) => tool.slug)).toEqual([
      'color-vision',
    ]);
  });

  it('matches Chinese title, summary, and tags', () => {
    expect(filterTools(fixtures, '色觉', 'all', 'zh-CN')).toHaveLength(1);
    expect(filterTools(fixtures, '文本', 'all', 'zh-CN')[0]?.slug).toBe('readability');
  });

  it('intersects the query with the selected category', () => {
    expect(filterTools(fixtures, 'check', 'vision', 'en')).toEqual([]);
    expect(filterTools(fixtures, '', 'text', 'en').map((tool) => tool.slug)).toEqual([
      'readability',
    ]);
  });
});
