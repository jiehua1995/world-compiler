import type { Locale } from '../../i18n/types';

export interface PlainLanguageResult {
  characterCount: number;
  wordCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
  longSentences: { index: number; wordCount: number; text: string }[];
  score: number | null;
}

const wordsIn = (sentence: string, locale: Locale) => locale === 'zh-CN'
  ? [...new Intl.Segmenter('zh-CN', { granularity: 'word' }).segment(sentence)].filter((part) => part.isWordLike).map((part) => part.segment)
  : sentence.match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu) ?? [];

const syllablesIn = (word: string, locale: 'en' | 'de') => {
  const normalized = word.toLocaleLowerCase(locale);
  const vowelRuns = normalized.match(locale === 'de' ? /[aeiouyäöü]+/gu : /[aeiouy]+/gu)?.length ?? 1;
  const silentEnglishE = locale === 'en' && /e$/u.test(normalized) && !/[^aeiouy]le$/u.test(normalized);
  return Math.max(1, vowelRuns - Number(silentEnglishE));
};

export function analyzePlainLanguage(text: string, locale: Locale): PlainLanguageResult {
  const characterCount = [...text].filter((character) => !/\s/u.test(character)).length;
  const sentences = text.split(/[.!?。！？]+/u).map((sentence) => sentence.trim()).filter(Boolean);
  const sentenceWords = sentences.map((sentence) => wordsIn(sentence, locale));
  const wordCount = sentenceWords.reduce((total, words) => total + words.length, 0);
  const averageWords = sentences.length ? wordCount / sentences.length : 0;
  const averageSentenceLength = Number(averageWords.toFixed(1));
  const longSentences = sentenceWords.flatMap((words, index) => words.length > (locale === 'zh-CN' ? 80 : 25)
    ? [{ index: index + 1, wordCount: words.length, text: sentences[index] }]
    : []);
  const syllableCount = locale === 'zh-CN' ? 0 : sentenceWords.flat().reduce((total, word) => total + syllablesIn(word, locale), 0);
  const score = locale === 'zh-CN' || wordCount < 30 || sentences.length < 3
    ? null
    : Number((locale === 'en'
      ? 206.835 - 1.015 * averageWords - 84.6 * (syllableCount / wordCount)
      : 180 - averageWords - 58.5 * (syllableCount / wordCount)).toFixed(1));
  return { characterCount, wordCount, sentenceCount: sentences.length, averageSentenceLength, longSentences, score };
}
