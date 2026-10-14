export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const validPreferences: readonly ThemePreference[] = ['system', 'light', 'dark'];

export function resolveThemePreference(stored: string | null): ThemePreference {
  return validPreferences.includes(stored as ThemePreference)
    ? (stored as ThemePreference)
    : 'system';
}

export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): ResolvedTheme {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
}
