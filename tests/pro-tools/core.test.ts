import { describe, expect, it } from 'vitest';
import { boundedRandomInt, convertColor, decodeHtmlEntities, explainCron, formatHtmlEntities, fractionFromWords, generateRandom, ipv4Subnet, nextCronRuns, normalizeText, parseYamlJson, passwordAudit, validUuid } from '../../src/features/pro-tools/core';

describe('professional tool core', () => {
  it('uses an injected random source and enforces lottery uniqueness', () => {
    const values = [0.01, 0.4, 0.9];
    expect(generateRandom('lottery', 3, 1, 10, () => values.shift()!)).toEqual([1, 5, 10]);
  });
  it('maps cryptographic words into a half-open unit interval', () => {
    expect(fractionFromWords(0, 0)).toBe(0);
    expect(fractionFromWords(0xffffffff, 0xffffffff)).toBeLessThan(1);
    expect(fractionFromWords(0xffffffff, 0xffffffff)).toBeGreaterThan(0.999999999999);
  });
  it('rejects the incomplete tail of a random range to avoid modulo bias', () => {
    expect(boundedRandomInt(9,0,9)).toBe(9);
    expect(boundedRandomInt(0x1fffffffffffff,0,9)).toBeNull();
  });
  it('rejects invalid random bounds', () => {
    expect(() => generateRandom('integer', 2, 10, 1)).toThrow();
  });
  it('converts common CSS color formats without losing channels', () => {
    expect(convertColor('#2f6db3')).toMatchObject({ hex: '#2F6DB3', rgb: 'rgb(47, 109, 179)' });
    expect(convertColor('rgb(47, 109, 179)').hsl).toMatch(/^hsl\(/);
  });
  it('parses safe YAML and returns formatted JSON', () => {
    expect(parseYamlJson('name: World Compiler\nactive: true')).toContain('"active": true');
    expect(() => parseYamlJson('a: [')).toThrow();
  });
  it('encodes HTML text rather than interpreting it', () => {
    expect(formatHtmlEntities('<script>&"')).toBe('&lt;script&gt;&amp;&quot;');
    expect(decodeHtmlEntities('&lt;b&gt; &amp; &#x1F680;')).toBe('<b> & 🚀');
  });
  it('normalizes text using explicit Unicode-aware options', () => {
    expect(normalizeText('  Café\r\nhello  ', 'slug')).toBe('cafe-hello');
  });
  it('calculates IPv4 network, usable range and broadcast', () => {
    expect(ipv4Subnet('192.168.1.22/24')).toMatchObject({ network: '192.168.1.0', broadcast: '192.168.1.255', first: '192.168.1.1', last: '192.168.1.254', hosts: 254 });
    expect(() => ipv4Subnet('999.1.1.1/33')).toThrow();
  });
  it('explains five-field cron and finds upcoming UTC matches', () => {
    expect(explainCron('*/15 9-17 * * 1-5')).toContain('minute');
    expect(nextCronRuns('0 12 * * *', new Date('2026-01-01T11:00:00Z'), 2)).toEqual(['2026-01-01T12:00:00.000Z', '2026-01-02T12:00:00.000Z']);
    expect(() => nextCronRuns('60 * * * *', new Date(), 1)).toThrow();
  });
  it('audits passwords locally without exposing the source', () => {
    expect(passwordAudit('Password123!')).toMatchObject({ length: 12, hasUpper: true, hasLower: true, hasDigit: true, hasSymbol: true });
  });
  it('validates UUID versions and variant bits', () => {
    expect(validUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(validUuid('550e8400-e29b-01d4-a716-446655440000')).toBe(false);
  });
});
