import { downloadBlob } from '../workbench/browser';
import { inspectMarkdown, markdownLineOffset, markdownTableFromDelimited, renderMarkdown } from './core';

const copy = (zh: string, en: string, de: string) => ({ 'zh-CN': zh, en, de }[document.documentElement.lang] ?? zh);

export function mountMarkdownStudio(root: HTMLElement): () => void {
  const get = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const editor = get<HTMLTextAreaElement>('[data-markdown-editor]');
  const preview = get<HTMLElement>('[data-markdown-preview]');
  const toc = get<HTMLElement>('[data-markdown-toc]');
  const diagnostics = get<HTMLElement>('[data-markdown-diagnostics]');
  const stats = get<HTMLElement>('[data-markdown-stats]');
  const status = get<HTMLElement>('[data-markdown-status]');
  const slug = root.dataset.proLab;
  let syncing = false;

  const update = () => {
    if (editor.value.length > 1_000_000) editor.value = editor.value.slice(0, 1_000_000);
    const source = editor.value;
    preview.innerHTML = renderMarkdown(source);
    toc.replaceChildren();
    const headings = [...preview.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')];
    headings.forEach((heading, index) => {
      const id = `${heading.textContent?.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/gu, '-') || 'section'}-${index + 1}`;
      heading.id = id;
      const link = document.createElement('a');
      link.href = `#${id}`;
      link.textContent = `${heading.tagName.slice(1)} · ${heading.textContent ?? ''}`;
      link.style.paddingInlineStart = `${(Number(heading.tagName.slice(1)) - 1) * 0.8}rem`;
      toc.append(link);
    });
    const words = source.match(/\S+/gu)?.length ?? 0;
    const chars = [...source].length;
    stats.textContent = copy(`${chars} 字符 · ${words} 词 · 约 ${Math.max(1, Math.ceil(words / 200))} 分钟`, `${chars} characters · ${words} words · about ${Math.max(1, Math.ceil(words / 200))} min`, `${chars} Zeichen · ${words} Wörter · ca. ${Math.max(1, Math.ceil(words / 200))} Min.`);
    diagnostics.replaceChildren();
    const issues = inspectMarkdown(source);
    if (!issues.length) {
      const item = document.createElement('li');
      item.textContent = copy('未发现结构问题。','No structural issues found.','Keine Strukturprobleme gefunden.');
      diagnostics.append(item);
    } else issues.forEach((issue) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.markdownIssue = issue.code;
      button.dataset.line = String(issue.line);
      const message = ({
        'missing-h1': copy('未找到一级标题。','No level-one heading found.','Keine Überschrift der Ebene 1 gefunden.'),
        'heading-jump': copy('标题层级跳级。','Heading levels skip a level.','Überschriften überspringen eine Ebene.'),
        'duplicate-heading': copy('此标题会产生重复锚点。','This heading creates a repeated anchor.','Diese Überschrift erzeugt einen doppelten Anker.'),
        'missing-image-alt': copy('图片缺少替代文本。','Image is missing alternative text.','Dem Bild fehlt ein Alternativtext.'),
        'incomplete-link': copy('链接语法不完整。','Link syntax is incomplete.','Die Linksyntax ist unvollständig.'),
        'relative-link': copy('请检查此相对链接。','Review this relative link.','Diesen relativen Link prüfen.'),
      })[issue.code];
      button.textContent = `${copy('第','Line ','Zeile ')}${issue.line}: ${message}`;
      item.append(button);
      diagnostics.append(item);
    });
  };

  const insert = (before: string, after = '') => {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = editor.value.slice(start, end) || copy('文本','text','Text');
    editor.setRangeText(`${before}${selected}${after}`, start, end, 'select');
    editor.focus();
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const onClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const action = target.closest<HTMLButtonElement>('[data-md-action]')?.dataset.mdAction;
    if (action === 'h1') insert('# ', '\n');
    else if (action === 'bold') insert('**', '**');
    else if (action === 'link') insert('[', '](https://example.org)');
    else if (action === 'code') insert('`', '`');
    else if (action === 'quote') insert('> ');
    else if (action === 'list') insert('- ');
    else if (action === 'table') {
      const builder = get<HTMLDetailsElement>('.markdown-table-builder');
      builder.open = true;
      get<HTMLTextAreaElement>('[data-table-input]').focus();
    }

    const issueButton = target.closest<HTMLButtonElement>('[data-markdown-issue]');
    if (issueButton) {
      const line = Number(issueButton.dataset.line);
      const offset = markdownLineOffset(editor.value, line);
      editor.focus();
      editor.setSelectionRange(offset, offset);
    }

    const tab = target.closest<HTMLButtonElement>('[data-mobile-tab]');
    if (tab) {
      root.dataset.mobileView = tab.dataset.mobileTab;
      root.querySelectorAll<HTMLButtonElement>('[data-mobile-tab]').forEach((button) => button.setAttribute('aria-pressed', String(button === tab)));
    }

    if (target.closest('[data-table-insert]')) {
      try {
        const delimiter = get<HTMLSelectElement>('[data-table-delimiter]').value === 'tab' ? '\t' : ',';
        const table = markdownTableFromDelimited(get<HTMLTextAreaElement>('[data-table-input]').value, delimiter);
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const prefix = start > 0 && editor.value[start - 1] !== '\n' ? '\n\n' : '';
        editor.setRangeText(`${prefix}${table}\n`, start, end, 'end');
        editor.focus();
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        get<HTMLElement>('[data-table-status]').textContent = copy('表格已插入。','Table inserted.','Tabelle eingefügt.');
      } catch {
        get<HTMLElement>('[data-table-status]').textContent = copy('无法构造表格，请检查分隔符、引号和列数。','Cannot build the table. Check delimiter, quotes and column counts.','Tabelle nicht möglich. Trennzeichen, Anführungszeichen und Spaltenzahl prüfen.');
      }
    }
    if (target.closest('[data-markdown-copy]')) {
      void navigator.clipboard.writeText(editor.value).then(() => { status.textContent = copy('Markdown 已复制。','Markdown copied.','Markdown kopiert.'); }).catch(() => { editor.focus(); editor.select(); status.textContent = copy('复制失败；已选中文本，可手动复制。','Copy failed; text selected for manual copying.','Kopieren fehlgeschlagen; Text zum manuellen Kopieren markiert.'); });
    }
    if (target.closest('[data-markdown-download]')) downloadBlob(new Blob([editor.value], { type: 'text/markdown;charset=utf-8' }), 'document.md');
  };
  const onScroll = (event: Event) => {
    const checkbox = get<HTMLInputElement>('[data-sync-scroll]');
    if (!checkbox.checked || syncing) return;
    const source = event.currentTarget as HTMLElement;
    const target = source === editor ? preview : editor;
    syncing = true;
    const ratio = source.scrollTop / Math.max(1, source.scrollHeight - source.clientHeight);
    target.scrollTop = ratio * Math.max(0, target.scrollHeight - target.clientHeight);
    requestAnimationFrame(() => { syncing = false; });
  };
  const onLocaleChange = () => update();

  editor.addEventListener('input', update);
  editor.addEventListener('scroll', onScroll);
  preview.addEventListener('scroll', onScroll);
  root.addEventListener('click', onClick);
  document.addEventListener('worldcompiler:localechange', onLocaleChange);
  update();
  if (slug === 'markdown-table') get<HTMLElement>('.markdown-table-builder').setAttribute('open', '');
  return () => {
    editor.removeEventListener('input', update);
    editor.removeEventListener('scroll', onScroll);
    preview.removeEventListener('scroll', onScroll);
    root.removeEventListener('click', onClick);
    document.removeEventListener('worldcompiler:localechange', onLocaleChange);
  };
}
