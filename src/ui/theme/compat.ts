// Compat layer for the original Tidewater token shape.
//
// The redesign moves every primitive onto `useTheme().tokens` (semantic keys —
// `bg`, `surface`, `text`, `accent`, `ok`, `warn`, `danger`, ...). The legacy
// primitives we haven't redesigned yet still import `colors`, `tidewater`,
// `docBand`, `stamp`, `hairlines` from `./tokens`. To keep them rendering under
// every theme during the migration, those legacy shapes are *derived* from the
// active theme's tokens here, then surfaced by both `tokens.ts` (default theme,
// for non-React static imports) and `theme-provider.tsx` (active theme,
// reactive via `useTheme()`).
//
// Mapping is intentionally dumb and one-way. Legacy primitives may look rough
// under dark themes; they are scheduled for deletion as their last consumer
// gets redesigned out from under them.

import type { Theme, ThemeTokens } from './themes';

export interface LegacyTidewater {
  ink: string;
  ink2: string;
  ink3: string;
  paper: string;
  paper2: string;
  white: string;
  accent: string;
  accentSoft: string;
  yellow: string;
  yellowDeep: string;
  yellowSoft: string;
  red: string;
  redSoft: string;
  green: string;
  greenSoft: string;
  hair: string;
  hairSoft: string;
  hairFaint: string;
}

export interface LegacyColors {
  bgApp: string;
  bgSurface: string;
  bgMuted: string;
  border: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  accentPrimary: string;
  accentPressed: string;
  accentTint: string;
  navBar: string;
  navBarActive: string;
  statusOk: string;
  statusWarn: string;
  statusErr: string;
  statusInfo: string;
  statusOkTint: string;
  statusWarnTint: string;
  statusErrTint: string;
  statusInfoTint: string;
  certL1: string;
  certL2: string;
  certL3: string;
  overlay: string;
}

export interface LegacyHairlines {
  standard: { width: number; color: string };
  soft: { width: number; color: string };
  faint: { width: number; color: string };
}

export interface LegacyDocBand {
  top: { background: string; foreground: string; accent: string };
  footer: { background: string; foreground: string; border: string };
}

export interface LegacyStamp {
  rotation: { light: number; standard: number; heavy: number; forward: number };
  opacity: number;
  borderWidth: number;
  tones: { green: string; yellow: string; red: string; ink: string; mute: string };
}

export function deriveTidewater(t: ThemeTokens): LegacyTidewater {
  return {
    ink: t.text,
    ink2: t.textDim,
    ink3: t.textFaint,
    paper: t.bg,
    paper2: t.surface2,
    white: t.surface,
    accent: t.accent,
    accentSoft: t.accentSoft,
    yellow: t.warn,
    yellowDeep: t.warn,
    yellowSoft: t.warnSoft,
    red: t.danger,
    redSoft: t.dangerSoft,
    green: t.ok,
    greenSoft: t.okSoft,
    hair: t.line,
    hairSoft: t.lineSoft,
    hairFaint: t.lineSoft,
  };
}

export function deriveColors(theme: Theme): LegacyColors {
  const t = theme.tokens;
  // navBar was always the dark "ink" bar with light text. Under dark themes
  // the legacy bar would render light-on-light which is unreadable, so we
  // collapse it onto a theme-surface bar with primary text. The redesigned
  // TabBar (task #5) replaces this shape entirely.
  const navBar = theme.mode === 'dark' ? t.surface : t.text;
  const navBarActive = theme.mode === 'dark' ? t.accentSoft : t.accent;
  const textInverse = theme.mode === 'dark' ? t.text : t.bg;
  return {
    bgApp: t.bg,
    bgSurface: t.surface,
    bgMuted: t.surface2,
    border: t.line,
    divider: t.lineSoft,
    textPrimary: t.text,
    textSecondary: t.textDim,
    textMuted: t.textFaint,
    textInverse,
    accentPrimary: t.accent,
    accentPressed: t.accentInk,
    accentTint: t.accentSoft,
    navBar,
    navBarActive,
    statusOk: t.ok,
    statusWarn: t.warn,
    statusErr: t.danger,
    statusInfo: t.textDim,
    statusOkTint: t.okSoft,
    statusWarnTint: t.warnSoft,
    statusErrTint: t.dangerSoft,
    statusInfoTint: t.lineSoft,
    certL1: t.accent,
    certL2: t.ok,
    certL3: t.text,
    overlay: t.scrim,
  };
}

export function deriveHairlines(t: ThemeTokens): LegacyHairlines {
  return {
    standard: { width: 1, color: t.line },
    soft: { width: 1, color: t.lineSoft },
    faint: { width: 1, color: t.lineSoft },
  };
}

export function deriveDocBand(t: ThemeTokens): LegacyDocBand {
  return {
    top: { background: t.text, foreground: t.bg, accent: t.warn },
    footer: { background: t.surface2, foreground: t.textDim, border: t.line },
  };
}

export function deriveStamp(t: ThemeTokens): LegacyStamp {
  return {
    rotation: { light: -3, standard: -6, heavy: -9, forward: 6 },
    opacity: 0.78,
    borderWidth: 2.5,
    tones: {
      green: t.ok,
      yellow: t.warn,
      red: t.danger,
      ink: t.text,
      mute: t.textFaint,
    },
  };
}

// Non-token constants kept identical to the original tokens.ts.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const touchTarget = { min: 44, preferred: 48 } as const;

export const typography = {
  title1: { fontFamily: 'Inter_600SemiBold', fontSize: 28, lineHeight: 34, fontWeight: '600' },
  title2: { fontFamily: 'Inter_600SemiBold', fontSize: 21, lineHeight: 28, fontWeight: '600' },
  title3: { fontFamily: 'Inter_600SemiBold', fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyMed: { fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 24, fontWeight: '500' },
  bodyBold: { fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 24, fontWeight: '700' },
  label: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16, fontWeight: '400' },

  displayXl: { fontFamily: 'Archivo_900Black', fontSize: 40, lineHeight: 42, fontWeight: '900', letterSpacing: -0.4 },
  displayLg: { fontFamily: 'Archivo_900Black', fontSize: 28, lineHeight: 32, fontWeight: '900', letterSpacing: -0.2 },
  displayMd: { fontFamily: 'Archivo_800ExtraBold', fontSize: 20, lineHeight: 24, fontWeight: '800', letterSpacing: 0 },
  displaySm: { fontFamily: 'Archivo_700Bold', fontSize: 14, lineHeight: 18, fontWeight: '700', letterSpacing: 1.2 },

  mono: { fontFamily: 'IBMPlexMono_400Regular', fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 1.2 },
  monoMd: { fontFamily: 'IBMPlexMono_500Medium', fontSize: 14, lineHeight: 18, fontWeight: '500', letterSpacing: 1 },
  monoLg: { fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 16, lineHeight: 20, fontWeight: '600', letterSpacing: 0.6 },
  monoSm: { fontFamily: 'IBMPlexMono_400Regular', fontSize: 10, lineHeight: 14, fontWeight: '400', letterSpacing: 1.5 },

  italicStamp: {
    fontFamily: 'Newsreader_700Bold_Italic',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
    fontStyle: 'italic',
    letterSpacing: 3,
  },
  italicSig: {
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '500',
    fontStyle: 'italic',
  },

  formNumber: { fontFamily: 'IBMPlexMono_500Medium', fontSize: 11, lineHeight: 14, fontWeight: '500', letterSpacing: 1.8 },
} as const;

export interface LegacyShape {
  colors: LegacyColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  touchTarget: typeof touchTarget;
  tidewater: LegacyTidewater;
  hairlines: LegacyHairlines;
  docBand: LegacyDocBand;
  stamp: LegacyStamp;
}

export function deriveLegacy(theme: Theme): LegacyShape {
  const t = theme.tokens;
  return {
    colors: deriveColors(theme),
    spacing,
    radii,
    typography,
    touchTarget,
    tidewater: deriveTidewater(t),
    hairlines: deriveHairlines(t),
    docBand: deriveDocBand(t),
    stamp: deriveStamp(t),
  };
}
