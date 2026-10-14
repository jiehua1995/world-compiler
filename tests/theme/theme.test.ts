import { describe, expect, it } from 'vitest';
import { resolveTheme, resolveThemePreference } from '../../src/theme/theme';

describe('theme resolution', () => {
  it('falls back to system for missing or malformed preferences', () => {
    expect(resolveThemePreference(null)).toBe('system');
    expect(resolveThemePreference('midnight')).toBe('system');
  });

  it('preserves valid stored preferences', () => {
    expect(resolveThemePreference('light')).toBe('light');
    expect(resolveThemePreference('dark')).toBe('dark');
    expect(resolveThemePreference('system')).toBe('system');
  });

  it('resolves system and explicit choices to a rendered theme', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});
