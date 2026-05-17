// Legacy compat shim — derives the original Tidewater token shape from the
// active default theme (Tungsten) so existing primitives and static imports
// keep working while the redesign migrates each screen to `useTheme().tokens`.
//
// New code should consume `useTheme().tokens` instead of importing from here.
// This file disappears in the final-sweep task once no consumers remain.

import { DEFAULT_THEME_KEY, THEMES } from './themes';
import {
  deriveColors,
  deriveDocBand,
  deriveHairlines,
  deriveStamp,
  deriveTidewater,
  radii as radiiTokens,
  spacing as spacingTokens,
  touchTarget as touchTargetTokens,
  typography as typographyTokens,
} from './compat';

const defaultTheme = THEMES[DEFAULT_THEME_KEY];

export const tidewater = deriveTidewater(defaultTheme.tokens);
export const colors = deriveColors(defaultTheme);
export const hairlines = deriveHairlines(defaultTheme.tokens);
export const docBand = deriveDocBand(defaultTheme.tokens);
export const stamp = deriveStamp(defaultTheme.tokens);
export const spacing = spacingTokens;
export const radii = radiiTokens;
export const typography = typographyTokens;

export const theme = {
  colors,
  spacing,
  radii,
  typography,
  touchTarget: touchTargetTokens,
  tidewater,
  hairlines,
  docBand,
  stamp,
} as const;

export type Theme = typeof theme;
