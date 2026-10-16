import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { parseDelimitedText } from '../data-shape/csv';
const RANDOM_SPACE = Number.MAX_SAFE_INTEGER + 1;

const clampInt = (n: number, min: number, max: number) => {
  if (!Number.isInteger(n) || n < min || n > max) throw new Error('out of range');
  return n;
};

export function generateRandomFrom(mode: 'integer' | 'lottery' | 'dice', count: number, min: number, max: number, draw: (min:number,max:number)=>number): number[] {
  clampInt(count, 1, 1000);
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max || !Number.isSafeInteger(max - min + 1)) throw new Error('invalid bounds');
  if (mode === 'dice') { min = 1; max = 6; }
  if (mode === 'lottery' && count > max - min + 1) throw new Error('not enough unique values');
  const result: number[] = [];
  for (let attempt = 0; result.length < count && attempt < count * 100; attempt++) {
    const value = draw(min,max);
    if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error('random value out of bounds');
    if (mode !== 'lottery' || !result.includes(value)) result.push(value);
  }
  if (result.length !== count) throw new Error('random source did not produce unique values');
  return result;
}
export function generateRandom(mode: 'integer' | 'lottery' | 'dice', count: number, min: number, max: number, random = Math.random): number[] {
  return generateRandomFrom(mode,count,min,max,(low,high)=>{
    const sample=random();
    if(!Number.isFinite(sample)||sample<0||sample>=1)throw new Error('random value must be in [0, 1)');
    return low+Math.floor(sample*(high-low+1));
  });
}
export function boundedRandomInt(candidate: number, min: number, max: number): number | null {
  if (!Number.isSafeInteger(candidate) || candidate < 0 || candidate >= RANDOM_SPACE || !Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) throw new Error('invalid random range');
  const range = max - min + 1;
  if (!Number.isSafeInteger(range)) throw new Error('random range is too large');
  const limit = Math.floor(RANDOM_SPACE / range) * range;
  return candidate < limit ? min + candidate % range : null;
}
export function fractionFromWords(high: number, low: number): number {
  return (((high >>> 0) * 0x200000) + ((low >>> 0) >>> 11)) / RANDOM_SPACE;
}

type RGB = { r: number; g: number; b: number };
const channel = (n: number) => clampInt(n, 0, 255);
function parseColor(value: string): RGB {
  const text = value.trim();
  const hex = text.match(/^#?([\da-f]{3}|[\da-f]{6})$/iu)?.[1];
  if (hex) {
    const expanded = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
    return { r: parseInt(expanded.slice(0, 2), 16), g: parseInt(expanded.slice(2, 4), 16), b: parseInt(expanded.slice(4, 6), 16) };
  }
  const rgb = text.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:1|0|0?\.\d+))?\s*\)$/iu);
  if (rgb) return { r: channel(Number(rgb[1])), g: channel(Number(rgb[2])), b: channel(Number(rgb[3])) };
  throw new Error('unsupported color; use HEX or RGB');
}
export function convertColor(value: string): { hex: string; rgb: string; hsl: string } {
  const { r, g, b } = parseColor(value);
  const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), delta = max - min;
  let h = 0;
  if (delta) h = max === rn ? ((gn - bn) / delta) % 6 : max === gn ? (bn - rn) / delta + 2 : (rn - gn) / delta + 4;
  h = (h * 60 + 360) % 360;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { hex, rgb: `rgb(${r}, ${g}, ${b})`, hsl: `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)` };
}

export function parseYamlJson(text: string): string {
  const value = parseYaml(text, { uniqueKeys: true, maxAliasCount: 50 });
  return JSON.stringify(value, null, 2);
}
export function stringifyJsonYaml(text: string): string { return stringifyYaml(JSON.parse(text), { lineWidth: 0 }); }
export function formatHtmlEntities(text: string): string { return text.replace(/[&<>"']/gu, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!); }
export function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
  return text.replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|nbsp);/giu, (whole, entity: string) => {
    if (entity[0] !== '#') return entities[entity.toLowerCase()] ?? whole;
    const code = entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : whole;
  });
}

export function normalizeText(text: string, mode: 'slug' | 'title' | 'sentence' | 'trim' | 'dedupe'): string {
  if (mode === 'slug') return text.normalize('NFKD').replace(/[\u0300-\u036f]/gu, '').toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/gu, '');
  if (mode === 'trim') return text.split(/\r?\n/u).map((line) => line.trim()).join('\n').trim();
  if (mode === 'dedupe') return [...new Set(text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean))].join('\n');
  if (mode === 'title') return text.toLocaleLowerCase().replace(/(^|[\s\p{P}])\p{L}/gu, (s) => s.toLocaleUpperCase());
  return text.trim().replace(/\s+/gu, ' ').replace(/^\p{L}/u, (s) => s.toLocaleUpperCase());
}

function ipv4(value: string): number {
  const parts = value.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/u.test(part) || Number(part) > 255)) throw new Error('invalid IPv4 address');
  return parts.reduce((total, part) => ((total << 8) | Number(part)) >>> 0, 0);
}
const ipText = (value: number) => [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.');
export function ipv4Subnet(cidr: string): { address: string; prefix: number; mask: string; network: string; broadcast: string; first: string; last: string; hosts: number } {
  const match = cidr.trim().match(/^([^/]+)\/(\d{1,2})$/u);
  if (!match) throw new Error('use IPv4 CIDR notation');
  const address = ipv4(match[1]), prefix = clampInt(Number(match[2]), 0, 32);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (address & mask) >>> 0, broadcast = (network | (~mask >>> 0)) >>> 0;
  const hosts = prefix >= 31 ? 2 ** (32 - prefix) : 2 ** (32 - prefix) - 2;
  return { address: ipText(address), prefix, mask: ipText(mask), network: ipText(network), broadcast: ipText(broadcast), first: ipText(prefix >= 31 ? network : network + 1), last: ipText(prefix >= 31 ? broadcast : broadcast - 1), hosts };
}

const cronField = (field: string, min: number, max: number): Set<number> => {
  const values = new Set<number>();
  for (const part of field.split(',')) {
    const [range, stepText] = part.split('/');
    if (!range || (part.includes('/') && !stepText)) throw new Error('invalid cron step');
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1 || step > max - min + 1) throw new Error('invalid cron step');
    const bounds = range === '*' ? [min, max] : range.split('-').map(Number);
    const first = bounds[0], last = bounds.length === 1 ? bounds[0] : bounds[1];
    if (bounds.length > 2 || !Number.isInteger(first) || !Number.isInteger(last) || first < min || last > max || first > last) throw new Error('invalid cron range');
    for (let n = first; n <= last; n += step) values.add(n);
  }
  return values;
};
function parseCron(expression: string): Set<number>[] {
  const fields = expression.trim().split(/\s+/u);
  if (fields.length !== 5) throw new Error('use five-field cron syntax');
  return [cronField(fields[0], 0, 59), cronField(fields[1], 0, 23), cronField(fields[2], 1, 31), cronField(fields[3], 1, 12), cronField(fields[4], 0, 7)];
}
export function explainCron(expression: string): string {
  const fields = parseCron(expression);
  return ['minute', 'hour', 'day of month', 'month', 'day of week'].map((name, index) => `${name}: ${[...fields[index]].sort((a, b) => a - b).join(', ')}`).join('\n');
}
export function nextCronRuns(expression: string, after: Date, count: number): string[] {
  const fields = parseCron(expression); clampInt(count, 1, 20);
  if (!Number.isFinite(after.getTime())) throw new Error('invalid starting date');
  const matches = (set: Set<number>, n: number, dow = false) => set.has(n) || (dow && n === 0 && set.has(7));
  const result: string[] = [], cursor = new Date(after); cursor.setUTCSeconds(0, 0); cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  for (let i = 0; i < 527040 && result.length < count; i++, cursor.setUTCMinutes(cursor.getUTCMinutes() + 1)) {
    const domWildcard = expression.trim().split(/\s+/u)[2] === '*', dowWildcard = expression.trim().split(/\s+/u)[4] === '*';
    const dayMatch = domWildcard || dowWildcard ? matches(fields[2], cursor.getUTCDate()) && matches(fields[4], cursor.getUTCDay(), true) : matches(fields[2], cursor.getUTCDate()) || matches(fields[4], cursor.getUTCDay(), true);
    if (matches(fields[0], cursor.getUTCMinutes()) && matches(fields[1], cursor.getUTCHours()) && dayMatch && matches(fields[3], cursor.getUTCMonth() + 1)) result.push(cursor.toISOString());
  }
  if (result.length !== count) throw new Error('no run found within one year');
  return result;
}

export function passwordAudit(password: string): { length: number; hasUpper: boolean; hasLower: boolean; hasDigit: boolean; hasSymbol: boolean; estimatedBits: number } {
  const hasUpper = /\p{Lu}/u.test(password), hasLower = /\p{Ll}/u.test(password), hasDigit = /\d/u.test(password), hasSymbol = /[^\p{L}\p{N}]/u.test(password);
  const pool = (hasUpper ? 26 : 0) + (hasLower ? 26 : 0) + (hasDigit ? 10 : 0) + (hasSymbol ? 33 : 0);
  return { length: [...password].length, hasUpper, hasLower, hasDigit, hasSymbol, estimatedBits: Math.round([...password].length * Math.log2(Math.max(pool, 1))) };
}
export function validUuid(value: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value.trim()); }

export function inferJsonSchema(source: string): Record<string, unknown> {
  const root: unknown = JSON.parse(source);
  const infer = (value: unknown, depth = 0): Record<string, unknown> => {
    if (depth > 16) throw new Error('nesting limit');
    if (value === null) return { type: 'null' };
    if (typeof value === 'string' || typeof value === 'boolean') return { type: typeof value };
    if (typeof value === 'number') return { type: Number.isInteger(value) ? 'integer' : 'number' };
    if (Array.isArray(value)) return { type: 'array', ...(value.length ? { items: infer(value[0], depth + 1) } : {}) };
    if (typeof value === 'object') return { type: 'object', properties: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, infer(item, depth + 1)])), required: Object.keys(value), additionalProperties: false };
    throw new Error('unsupported JSON');
  };
  if (Array.isArray(root) && root.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
    const rows = root as Record<string, unknown>[];
    const keys = [...new Set(rows.flatMap(Object.keys))].sort();
    const properties = Object.fromEntries(keys.map(key => {
      const values = rows.filter(row => Object.hasOwn(row, key)).map(row => row[key]);
      const types = [...new Set(values.map(value => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value === 'number' ? Number.isInteger(value) ? 'integer' : 'number' : typeof value))].sort();
      const schema = infer(values[0]);
      if (types.length > 1) schema.type = types;
      else if (values.length < rows.length) schema.type = [...new Set([...types, 'null'])].sort();
      return [key, schema];
    }));
    return { type: 'array', items: { type: 'object', properties, required: keys.filter(key => rows.every(row => Object.hasOwn(row, key))), additionalProperties: false } };
  }
  return infer(root);
}

export function parseJsonPath(source: string, path: string): unknown[] {
  if (source.length > 1_000_000 || path.length > 500 || !path.startsWith('$')) throw new Error('input or path limit exceeded');
  const tokens: (string | number | '*')[] = [], pattern = /\.([A-Za-z_$][\w$]*)|\[(\d+|\*)\]/gy;
  for (let at = 1; at < path.length;) { pattern.lastIndex = at; const match = pattern.exec(path); if (!match) throw new Error('unsupported JSONPath'); tokens.push(match[1] ?? (match[2] === '*' ? '*' : Number(match[2]))); at = pattern.lastIndex; }
  let values: unknown[] = [JSON.parse(source)];
  for (const token of tokens) values = values.flatMap(value => token === '*' ? Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : [] : typeof token === 'number' ? Array.isArray(value) && token < value.length ? [value[token]] : [] : value && typeof value === 'object' && Object.hasOwn(value, token) ? [(value as Record<string, unknown>)[token]] : []);
  if (values.length > 10_000) throw new Error('result limit exceeded');
  return values;
}

export function toBase(source: string, radix: number): { binary: string; octal: string; decimal: string; hexadecimal: string } {
  const text = source.trim().toLowerCase(), digits = '0123456789abcdef';
  if (![2, 8, 10, 16].includes(radix) || !/^-?[0-9a-f]+$/u.test(text) || [...text.replace(/^-/, '')].some(char => digits.indexOf(char) >= radix)) throw new Error('invalid integer for selected base');
  const negative = text.startsWith('-'); let value = 0n;
  for (const char of text.replace(/^-/, '')) value = value * BigInt(radix) + BigInt(digits.indexOf(char));
  if (negative) value = -value;
  return { binary: value.toString(2), octal: value.toString(8), decimal: value.toString(10), hexadecimal: value.toString(16).toUpperCase() };
}

export function inspectUnicode(text: string): { codePoints: number; utf8Bytes: number; points: { character: string; codePoint: string; name: string }[] } {
  if ([...text].length > 5000) throw new Error('character limit exceeded');
  const points = [...text].map(character => { const n = character.codePointAt(0)!; return { character, codePoint: `U+${n.toString(16).toUpperCase().padStart(n <= 0xffff ? 4 : 5, '0')}`, name: n === 32 ? 'SPACE' : n === 10 ? 'LINE FEED' : n === 9 ? 'TAB' : n >= 48 && n <= 57 ? `DIGIT ${character}` : n >= 65 && n <= 90 ? `LATIN CAPITAL LETTER ${character}` : n >= 97 && n <= 122 ? `LATIN SMALL LETTER ${character.toUpperCase()}` : 'UNICODE CHARACTER' }; });
  return { codePoints: points.length, utf8Bytes: new TextEncoder().encode(text).length, points };
}

export function profileCsv(source: string): { rows: number; columns: { name: string; missing: number; distinct: number }[] } {
  const rows = parseDelimitedText(source, ',');
  if (!rows.length || rows.length > 100_001) throw new Error('CSV row limit exceeded');
  const [header, ...data] = rows;
  if (!header.length || header.length > 200 || new Set(header).size !== header.length || data.some(row => row.length !== header.length)) throw new Error('inconsistent CSV headers or rows');
  return { rows: data.length, columns: header.map((name, i) => { const values = data.map(row => row[i]); return { name, missing: values.filter(value => !value.trim()).length, distinct: new Set(values.filter(value => value.trim())).size }; }) };
}

export function validateRobots(source: string): { groups: number; directives: number; warnings: string[] } {
  if (source.length > 1_000_000) throw new Error('file too large');
  let groups = 0, directives = 0, hasAgent = false; const warnings: string[] = [];
  for (const raw of source.split(/\r?\n/u)) {
    const line = raw.split('#', 1)[0].trim(); if (!line) continue;
    const match = line.match(/^([\w-]+)\s*:\s*(.*)$/u);
    if (!match) { warnings.push(`Invalid directive: ${line.slice(0, 80)}`); continue; }
    const key = match[1].toLowerCase(), value = match[2].trim();
    if (key === 'user-agent') { if (!value) warnings.push('Empty user-agent'); else if (!hasAgent) { groups++; hasAgent = true; } continue; }
    if (!['allow', 'disallow', 'crawl-delay', 'sitemap', 'host'].includes(key)) { warnings.push(`Unknown directive: ${key}`); continue; }
    if (['allow', 'disallow'].includes(key) && !hasAgent) warnings.push(`${key} appears before user-agent`); else directives++;
  }
  return { groups, directives, warnings };
}
