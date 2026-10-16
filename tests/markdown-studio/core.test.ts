import { describe, expect, it } from 'vitest';
import { inspectMarkdown, markdownLineOffset, markdownTableFromDelimited, renderMarkdown } from '../../src/features/markdown-studio/core';

describe('Markdown Studio core', () => {
  it('renders GFM tables and task lists while suppressing raw HTML and remote images', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n| A | B |\n| - | - |\n| x | y |\n\n- [x] done\n\n![remote](https://example.org/a.png)');
    expect(html).toContain('<table>');
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
  });

  it('keeps unsafe link schemes inert while preserving ordinary links', () => {
    const html = renderMarkdown('[bad](javascript:alert%281%29) [good](https://example.org)');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('href="https://example.org"');
  });

  it('reports heading jumps and repeated anchors on their source lines', () => {
    const issues = inspectMarkdown('# Start\n\n### Gap\n\n## Repeat\n\n## Repeat');
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ line: 3, code: 'heading-jump' }),
      expect.objectContaining({ line: 7, code: 'duplicate-heading' }),
    ]));
  });

  it('locates missing image alt text, incomplete links, and relative destinations', () => {
    const issues = inspectMarkdown('# Guide\n\n![](photo.png)\n\n[unfinished](\n[local](./guide.md)');
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ line: 3, code: 'missing-image-alt' }),
      expect.objectContaining({ line: 5, code: 'incomplete-link' }),
      expect.objectContaining({ line: 6, code: 'relative-link' }),
    ]));
  });

  it('maps diagnostic lines to the correct source offset with CRLF newlines', () => {
    expect(markdownLineOffset('first\r\nsecond\r\nthird', 3)).toBe(15);
  });

  it('converts quoted CSV cells and escapes Markdown pipes', () => {
    expect(markdownTableFromDelimited('name,note\nAda,"a|b, c"', ',')).toBe(
      '| name | note |\n| --- | --- |\n| Ada | a\\|b, c |',
    );
  });

  it('rejects malformed or ragged tabular input rather than dropping cells', () => {
    expect(() => markdownTableFromDelimited('a,b\n1', ',')).toThrow();
    expect(() => markdownTableFromDelimited('a,"unfinished', ',')).toThrow();
  });
});
