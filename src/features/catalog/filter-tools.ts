import type { ToolCategory, ToolDefinition } from '../../data/tools';
import type { Locale } from '../../i18n/types';

function searchableText(tool: ToolDefinition, locale: Locale): string {
  return [tool.title[locale], tool.summary[locale], ...tool.tags[locale]]
    .join(' ')
    .toLocaleLowerCase(locale);
}

export function filterTools(
  allTools: readonly ToolDefinition[],
  query: string,
  category: ToolCategory | 'all',
  locale: Locale,
): readonly ToolDefinition[] {
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  return allTools.filter((tool) =>
    (category === 'all' || tool.category === category)
    && (!normalizedQuery || searchableText(tool, locale).includes(normalizedQuery)),
  );
}
