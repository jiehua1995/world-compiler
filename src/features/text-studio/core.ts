export type TextOperation = 'upper' | 'lower' | 'title' | 'sentence' | 'slug' | 'trim-lines' | 'collapse-whitespace' | 'dedupe' | 'sort' | 'nfc' | 'nfkc' | 'lf' | 'crlf';

export function applyTextOperations(input: string, operations: TextOperation[]): string {
  return operations.reduce((text, operation) => {
    if (operation === 'upper') return text.toLocaleUpperCase();
    if (operation === 'lower') return text.toLocaleLowerCase();
    if (operation === 'title') return text.toLocaleLowerCase().replace(/(^|[\s\p{P}])\p{L}/gu, (value) => value.toLocaleUpperCase());
    if (operation === 'sentence') return text.trim().replace(/\s+/gu, ' ').replace(/^\p{L}/u, (value) => value.toLocaleUpperCase());
    if (operation === 'slug') return text.normalize('NFKD').replace(/[\u0300-\u036f]/gu, '').toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/gu, '');
    if (operation === 'trim-lines') return text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).join('\n');
    if (operation === 'collapse-whitespace') return text.replace(/\s+/gu, ' ').trim();
    if (operation === 'dedupe') return [...new Set(text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean))].join('\n');
    if (operation === 'sort') return text.split(/\r?\n/u).sort((a, b) => a.localeCompare(b)).join('\n');
    if (operation === 'nfc' || operation === 'nfkc') return text.normalize(operation === 'nfc' ? 'NFC' : 'NFKC');
    const lines = text.split(/\r\n|\r|\n/u);
    return lines.join(operation === 'lf' ? '\n' : '\r\n');
  }, input);
}

export function inspectText(text: string, locale = 'en'): { characters: number; bytes: number; words: number; lines: number } {
  const characters = [...new Intl.Segmenter(locale, { granularity: 'grapheme' }).segment(text)].length;
  return { characters, bytes: new TextEncoder().encode(text).length, words: (text.match(/\S+/gu) ?? []).length, lines: text ? text.split(/\r\n|\r|\n/u).length : 0 };
}
