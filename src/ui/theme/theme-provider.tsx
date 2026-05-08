import React from 'react';
import { theme, Theme } from './tokens';

const ThemeContext = React.createContext<Theme>(theme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return React.use(ThemeContext);
}

