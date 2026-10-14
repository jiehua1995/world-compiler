import { tools, type ToolCategory } from '../data/tools';
import { filterTools } from '../features/catalog/filter-tools';
import type { Locale } from '../i18n/types';

const localeFromDocument = (doc: Document): Locale => doc.documentElement.lang === 'en' ? 'en' : 'zh-CN';

export function initializeCatalog(doc: Document) {
  const root = doc.querySelector<HTMLElement>('[data-catalog]');
  const search = root?.querySelector<HTMLInputElement>('[data-catalog-search]');
  const cards = Array.from(root?.querySelectorAll<HTMLElement>('[data-tool-slug]') ?? []);
  const status = root?.querySelector<HTMLElement>('[data-catalog-status]');
  const empty = root?.querySelector<HTMLElement>('[data-catalog-empty]');
  const categoryButtons = Array.from(root?.querySelectorAll<HTMLButtonElement>('[data-category]') ?? []);
  const reset = root?.querySelector<HTMLButtonElement>('[data-catalog-reset]');
  let category: ToolCategory | 'all' = 'all';

  if (!root || !search || !status || !empty || !reset) return { destroy() {} };

  const localize = (locale: Locale) => {
    root.querySelectorAll<HTMLElement>('[data-copy-zh][data-copy-en]').forEach((element) => {
      element.textContent = locale === 'en' ? element.dataset.copyEn ?? '' : element.dataset.copyZh ?? '';
    });
    root.querySelectorAll<HTMLElement>('[data-label-zh][data-label-en]').forEach((element) => {
      element.setAttribute('aria-label', locale === 'en' ? element.dataset.labelEn ?? '' : element.dataset.labelZh ?? '');
    });
  };

  const render = () => {
    const locale = localeFromDocument(doc);
    const results = filterTools(tools, search.value, category, locale);
    const visibleSlugs = new Set(results.map((tool) => tool.slug));
    cards.forEach((card) => { card.hidden = !visibleSlugs.has(card.dataset.toolSlug ?? ''); });
    categoryButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
    status.textContent = locale === 'en' ? `${results.length} tools found` : `找到 ${results.length} 个工具`;
    empty.hidden = results.length > 0;
    localize(locale);
  };

  const onInput = () => render();
  const onCategory = (event: Event) => {
    const button = event.currentTarget as HTMLButtonElement;
    category = (button.dataset.category as ToolCategory | 'all') ?? 'all';
    render();
  };
  const onReset = () => { search.value = ''; category = 'all'; render(); search.focus(); };
  const onLocale = () => render();

  search.addEventListener('input', onInput);
  categoryButtons.forEach((button) => button.addEventListener('click', onCategory));
  reset.addEventListener('click', onReset);
  doc.addEventListener('worldcompiler:localechange', onLocale);
  render();

  return { destroy() {
    search.removeEventListener('input', onInput);
    categoryButtons.forEach((button) => button.removeEventListener('click', onCategory));
    reset.removeEventListener('click', onReset);
    doc.removeEventListener('worldcompiler:localechange', onLocale);
  } };
}
