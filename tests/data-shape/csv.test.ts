import { describe, expect, it } from 'vitest';
import { cleanRows, MAX_FILE_BYTES, parseDelimitedText, serializeCsv } from '../../src/features/data-shape/csv';

describe('CSV and TSV processing', () => {
  it('parses quoted delimiters, doubled quotes, newlines, CRLF, and trailing empty cells', () => {
    expect(parseDelimitedText('name,note,empty\r\nAda,"said ""hello, world""\nand left",\r\n', ',')).toEqual([
      ['name', 'note', 'empty'], ['Ada', 'said "hello, world"\nand left', ''],
    ]);
    expect(parseDelimitedText('a\tb\n"x\ty"\tz', '\t')).toEqual([['a', 'b'], ['x\ty', 'z']]);
  });

  it('rejects unmatched or malformed quoted cells', () => {
    expect(() => parseDelimitedText('a,"unterminated', ',')).toThrow();
    expect(() => parseDelimitedText('a,"ok"suffix', ',')).toThrow();
    expect(() => parseDelimitedText('a,un"escaped', ',')).toThrow();
  });

  it('trims cells, drops wholly blank rows, and serializes escaped CSV for a round trip', () => {
    const cleaned = cleanRows([[' name ', 'value'], [' ', '\t'], ['Ada', 'said "hi", then left'], ['line\none', '']]);
    expect(cleaned).toEqual([['name', 'value'], ['Ada', 'said "hi", then left'], ['line\none', '']]);
    expect(parseDelimitedText(serializeCsv(cleaned), ',')).toEqual(cleaned);
  });

  it('defines the 10 MB import limit', () => {
    expect(MAX_FILE_BYTES).toBe(10_000_000);
  });
});
