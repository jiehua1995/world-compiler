import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import { parseDelimitedText } from '../data-shape/csv';

export interface MarkdownIssue {
  line: number;
  code: 'missing-h1' | 'heading-jump' | 'duplicate-heading' | 'missing-image-alt' | 'incomplete-link' | 'relative-link';
  message: string;
}

const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false, breaks: false });
markdown.use(taskLists, { enabled: false, label: false });
markdown.renderer.rules.image = () => '';
const defaultLinkOpen = markdown.renderer.rules.link_open ?? ((tokens, index, options, _env, renderer) => renderer.renderToken(tokens, index, options));
markdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
  const token = tokens[index];
  const href = String(token.attrGet('href') ?? '');
  if (!markdown.validateLink(href)) {
    token.attrSet('href', '#');
    token.attrSet('aria-label', 'Unsafe link omitted');
  } else if (/^https?:\/\//iu.test(href)) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
  }
  return defaultLinkOpen(tokens, index, options, env, renderer);
};

export function renderMarkdown(source: string): string {
  return markdown.render(source);
}

export function markdownLineOffset(source: string, line: number): number {
  const newlines = /\r\n|\r|\n/gu;
  let currentLine = 1;
  let offset = 0;
  while (currentLine < line) {
    const match = newlines.exec(source);
    if (!match) return source.length;
    offset = newlines.lastIndex;
    currentLine += 1;
  }
  return offset;
}

const slug = (title: string) => title.trim().toLocaleLowerCase().replace(/<[^>]*>/gu, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/gu, '-');

export function inspectMarkdown(source: string): MarkdownIssue[] {
  const lines = source.split(/\r?\n/u);
  const issues: MarkdownIssue[] = [];
  const headings: { level: number; title: string; line: number }[] = [];
  lines.forEach((line, index) => {
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(line);
    if (heading) headings.push({ level: heading[1].length, title: heading[2], line: index + 1 });
    for (const image of line.matchAll(/!\[([^\]]*)\]\([^)]+\)/gu)) {
      if (!image[1].trim()) issues.push({ line: index + 1, code: 'missing-image-alt', message: 'Image is missing alternative text.' });
    }
    if (/\[[^\]]*\]\([^)]*$/u.test(line) || /\[[^\]]*\]\[[^\]]*$/u.test(line)) {
      issues.push({ line: index + 1, code: 'incomplete-link', message: 'Link syntax is incomplete.' });
    }
    for (const link of line.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/gu)) {
      const href = link[1].trim();
      if (href && !/^(?:https?:\/\/|mailto:|#|\/)/iu.test(href)) issues.push({ line: index + 1, code: 'relative-link', message: 'Review this relative link.' });
    }
  });
  if (!headings.some(({ level }) => level === 1)) issues.push({ line: 1, code: 'missing-h1', message: 'No level-one heading found.' });
  const seen = new Set<string>();
  for (let index = 0; index < headings.length; index++) {
    const heading = headings[index];
    if (index && heading.level > headings[index - 1].level + 1) issues.push({ line: heading.line, code: 'heading-jump', message: 'Heading levels skip a level.' });
    const key = slug(heading.title);
    if (seen.has(key)) issues.push({ line: heading.line, code: 'duplicate-heading', message: 'This heading creates a repeated anchor.' });
    seen.add(key);
  }
  return issues.sort((a, b) => a.line - b.line);
}

export function markdownTableFromDelimited(source: string, delimiter: ',' | '\t'): string {
  const rows = parseDelimitedText(source, delimiter);
  if (!rows.length || !rows[0].length || rows.some((row) => row.length !== rows[0].length)) throw new Error('Table rows must have the same number of columns.');
  const format = (row: string[]) => `| ${row.map((cell) => cell.replace(/\\/gu, '\\\\').replace(/\|/gu, '\\|').replace(/[\r\n]+/gu, ' ')).join(' | ')} |`;
  return [format(rows[0]), format(rows[0].map(() => '---')), ...rows.slice(1).map(format)].join('\n');
}
