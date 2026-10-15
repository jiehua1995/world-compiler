import { dictionary } from '../../i18n/dictionaries';
import { resolveLocale } from '../../i18n/locale';
import type { Locale } from '../../i18n/types';
import { analyzePlainLanguage } from './analyze';

export function mountPlainLanguageMeter(root: HTMLElement, doc: Document = document): { destroy: () => void } {
  const text = root.querySelector<HTMLTextAreaElement>('[data-analysis-text]');
  const language = root.querySelector<HTMLSelectElement>('[data-analysis-locale]');
  const score = root.querySelector<HTMLElement>('[data-stat="score"]');
  const longList = root.querySelector<HTMLOListElement>('[data-long-list]');
  const emptyLong = root.querySelector<HTMLElement>('[data-long-empty]');
  const stats = [...root.querySelectorAll<HTMLElement>('[data-stat]')];
  if (!text || !language || !score || !longList || !emptyLong || stats.length !== 5) return { destroy() {} };

  let manuallySelected = false;
  const currentLocale = () => resolveLocale(doc.documentElement.lang, []);
  language.value = currentLocale();
  const update = () => {
    const locale = language.value as Locale;
    const result = analyzePlainLanguage(text.value, locale);
    const copy = dictionary(currentLocale());
    for (const name of ['characterCount', 'wordCount', 'sentenceCount', 'averageSentenceLength'] as const) {
      root.querySelector<HTMLElement>(`[data-stat="${name}"]`)!.textContent = String(result[name]);
    }
    score.textContent = result.score === null ? copy['plain.scoreUnavailable'] : String(result.score);
    longList.replaceChildren(...result.longSentences.map(({ index, wordCount, text: sentence }) => {
      const item = doc.createElement('li');
      item.textContent = `${index}. ${sentence} (${wordCount})`;
      return item;
    }));
    emptyLong.hidden = result.longSentences.length > 0;
  };
  const onInput = () => update();
  const onLanguage = () => { manuallySelected = true; update(); };
  const onLocale = () => { if (!manuallySelected) language.value = currentLocale(); update(); };
  text.addEventListener('input', onInput);
  language.addEventListener('change', onLanguage);
  doc.addEventListener('worldcompiler:localechange', onLocale);
  update();
  return { destroy() { text.removeEventListener('input', onInput); language.removeEventListener('change', onLanguage); doc.removeEventListener('worldcompiler:localechange', onLocale); } };
}
