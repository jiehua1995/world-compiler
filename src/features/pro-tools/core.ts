import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
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
