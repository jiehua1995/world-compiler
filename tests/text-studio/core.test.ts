import { describe, expect, it } from 'vitest';
import { applyTextOperations, inspectText } from '../../src/features/text-studio/core';

describe('text studio', () => {
  it('applies selected operations in order without changing the source', () => {
    const source = '  Café\r\nCafé\r\nhello  ';
    expect(applyTextOperations(source, ['trim-lines', 'dedupe', 'slug'])).toBe('cafe-hello');
    expect(source).toBe('  Café\r\nCafé\r\nhello  ');
  });

  it('counts graphemes, UTF-8 bytes, words and lines accurately', () => {
    expect(inspectText('e\u0301 🚀\n')).toEqual({ characters: 4, bytes: 9, words: 2, lines: 2 });
  });
});
