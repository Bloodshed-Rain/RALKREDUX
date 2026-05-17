import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deriveLegacy,
  type LegacyColors,
  type LegacyDocBand,
  type LegacyHairlines,
  type LegacyStamp,
  type LegacyTidewater,
  radii as radiiTokens,
  spacing as spacingTokens,
  touchTarget as touchTargetTokens,
  typography as typographyTokens,
} from './compat';
import {
  DEFAULT_THEME_KEY,
  THEMES,
  type Theme,
  type ThemeKey,
  type ThemeTokens,
  isThemeKey,
} from './themes';

const THEME_PREF_KEY = 'ralb:pref:theme-key';

export interface ThemeContextValue {
  theme: Theme;
  tokens: ThemeTokens;
  setTheme: (key: ThemeKey) => void;

  // Legacy compat shape — primitives that haven't been redesigned yet
  // destructure these straight from useTheme(). Removed in the final sweep.
  colors: LegacyColors;
  spacing: typeof spacingTokens;
  radii: typeof radiiTokens;
  typography: typeof typographyTokens;
  touchTarget: typeof touchTargetTokens;
  tidewater: LegacyTidewater;
  hairlines: LegacyHairlines;
  docBand: LegacyDocBand;
  stamp: LegacyStamp;
}

function buildValue(themeKey: ThemeKey, setTheme: (key: ThemeKey) => void): ThemeContextValue {
  const theme = THEMES[themeKey];
  const legacy = deriveLegacy(theme);
  return {
    theme,
    tokens: theme.tokens,
    setTheme,
    ...legacy,
  };
}

const ThemeContext = React.createContext<ThemeContextValue>(
  buildValue(DEFAULT_THEME_KEY, () => {
    // No-op until provider mounts.
  }),
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKey] = React.useState<ThemeKey>(DEFAULT_THEME_KEY);

  // Hydrate from AsyncStorage on mount. Default theme renders during the
  // round-trip; the brief flash is acceptable for a non-critical preference.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(THEME_PREF_KEY);
        if (cancelled || raw == null) return;
        const parsed = JSON.parse(raw);
        if (isThemeKey(parsed)) setThemeKey(parsed);
      } catch {
        // Best-effort; default theme stands.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = React.useCallback((key: ThemeKey) => {
    if (!isThemeKey(key)) return;
    setThemeKey(key);
    void AsyncStorage.setItem(THEME_PREF_KEY, JSON.stringify(key)).catch(() => {
      // Best-effort persist.
    });
  }, []);

  const value = React.useMemo(() => buildValue(themeKey, setTheme), [themeKey, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={value.theme.mode === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return React.use(ThemeContext);
}
