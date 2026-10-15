export const MAX_FILE_BYTES = 10_000_000;
export const MAX_CELLS = 250_000;
export class DelimitedTextError extends Error {
  constructor(message: string, readonly code: 'invalid' | 'too-complex' = 'invalid') { super(message); }
}

export function parseDelimitedText(text: string, delimiter: ',' | '\t'): string[][] {
  if (!text) return [];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let afterQuote = false;
  let rowStarted = false;
  let cellCount = 0;
  const pushCell = () => {
    if (cellCount >= MAX_CELLS) throw new DelimitedTextError('Input contains too many cells.', 'too-complex');
    row.push(cell); cell = ''; cellCount += 1;
  };
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (character === '"') { quoted = false; afterQuote = true; }
      else cell += character;
      continue;
    }
    if (afterQuote && character !== delimiter && character !== '\r' && character !== '\n') throw new DelimitedTextError('Unexpected character after a quoted cell.');
    if (character === '"') {
      if (cell || afterQuote) throw new DelimitedTextError('Quote inside an unquoted cell.');
      quoted = true;
      rowStarted = true;
    } else if (character === delimiter) {
      pushCell(); afterQuote = false; rowStarted = true;
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      pushCell(); rows.push(row); row = []; afterQuote = false; rowStarted = false;
    } else {
      cell += character; rowStarted = true;
    }
  }
  if (quoted) throw new DelimitedTextError('Unclosed quoted cell.');
  if (rowStarted || cell || row.length || afterQuote) { pushCell(); rows.push(row); }
  return rows;
}

export function cleanRows(rows: string[][]): string[][] {
  return rows.map((row) => row.map((cell) => cell.trim())).filter((row) => row.some(Boolean));
}

export function serializeCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => /[",\r\n]/u.test(cell) ? `"${cell.replace(/"/gu, '""')}"` : cell).join(',')).join('\r\n');
}
