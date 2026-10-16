import { describe, expect, it } from 'vitest';
import { convertUnit, editUrl, palette, wav, randomPassword } from '../../src/features/native-tools/core';
describe('native tools', () => {
  it('converts temperature and binary data', () => { expect(convertUnit(32,'F','C')).toBeCloseTo(0); expect(convertUnit(1,'MiB','B')).toBe(1048576); expect(()=>convertUnit(1,'m','kg')).toThrow(); expect(()=>convertUnit(Number.MAX_VALUE,'GiB','B')).toThrow(); });
  it('preserves URL fragments and repeated parameters', () => { expect(editUrl('https://example.com/?a=1&a=2&utm_source=x#ok',true)).toBe('https://example.com/?a=1&a=2#ok'); expect(()=>editUrl('javascript:alert(1)',false)).toThrow(); });
  it('ignores transparent palette pixels', () => { expect(palette(new Uint8ClampedArray([255,0,0,255,0,255,0,0]),5)).toEqual(['#ff0000']); });
  it('encodes clipped little-endian PCM', () => { const result=wav([new Float32Array([-2,0,2])],44100); expect(result.byteLength).toBe(50); expect(new DataView(result).getInt16(44,true)).toBe(-32768); });
  it('rejects invalid password bounds', () => { expect(()=>randomPassword(0,'abc')).toThrow(); expect(()=>randomPassword(10,'')).toThrow(); expect(randomPassword(32,'abc')).toMatch(/^[abc]{32}$/); });
});
