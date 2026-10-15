import { describe, expect, it } from 'vitest';
import { analyzePlainLanguage } from '../../src/features/plain-language/analyze';

describe('plain language analysis', () => {
  it('does not assign a score to empty, punctuation-only, or very short text', () => {
    expect(analyzePlainLanguage('   ', 'en').score).toBeNull();
    expect(analyzePlainLanguage('?!…', 'de').score).toBeNull();
    expect(analyzePlainLanguage('A short sentence.', 'en').score).toBeNull();
  });

  it('uses the English Flesch Reading Ease formula and flags long sentences', () => {
    const sample = 'The cat can see. A dog can run. We like the sun.';
    const result = analyzePlainLanguage(Array(3).fill(sample).join(' '), 'en');
    expect(result.sentenceCount).toBe(9);
    expect(result.wordCount).toBe(36);
    expect(result.score).toBeCloseTo(206.835 - 1.015 * 4 - 84.6 * (12 / 12), 1);
    expect(result.longSentences).toEqual([]);
  });

  it('uses the German formula and approximate vowel nuclei', () => {
    const sample = 'Der Hund läuft schnell. Die Katze schläft ruhig. Wir sehen einen Vogel.';
    const result = analyzePlainLanguage(Array(3).fill(sample).join(' '), 'de');
    expect(result.score).toBeCloseTo(180 - 4 - 58.5 * (17 / 12), 1);
  });

  it('reports Chinese character and sentence metrics without a readability score', () => {
    expect(analyzePlainLanguage('你好，世界。我们来读书！', 'zh-CN')).toMatchObject({ characterCount: 12, sentenceCount: 2, score: null });
  });
});
