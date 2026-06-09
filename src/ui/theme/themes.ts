// Rope Access Logbook — Heliotype, in two shades (light + dark).
// Curated down to a single signature identity: the stamped, ink-on-paper
// "Heliotype" look (light) and its dark "ink stock" sibling. Every theme exports
// the same `ThemeTokens` shape; every primitive consumes `useTheme().tokens`
// rather than importing a static object, so swapping `setTheme(key)` re-skins the
// whole app in one render.

export type ThemeMode = 'light' | 'dark';

export interface ThemeTokens {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  line: string;
  lineSoft: string;
  text: string;
  textDim: string;
  textFaint: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  ok: string;
  okSoft: string;
  warn: string;
  warnSoft: string;
  danger: string;
  dangerSoft: string;
  chip: string;
  chipText: string;
  scrim: string;
  shadow: string;
  ring: string;
}

export type ThemeKey = 'heliotype' | 'heliotype-dark';

export interface Theme {
  key: ThemeKey;
  name: string;
  sub: string;
  mode: ThemeMode;
  swatch: [string, string, string];
  tokens: ThemeTokens;
}

export const THEMES: Record<ThemeKey, Theme> = {
  heliotype: {
    key: 'heliotype',
    name: 'Heliotype',
    sub: 'Bone paper · oxblood',
    mode: 'light',
    swatch: ['#F3EEDF', '#1A1410', '#8B1F1A'],
    tokens: {
      bg: '#F3EEDF',
      surface: '#FAF6E9',
      surface2: '#EBE5D3',
      surface3: '#DFD7C0',
      line: '#1A1410',
      lineSoft: '#CBC2A8',
      text: '#1A1410',
      textDim: '#574E40',
      textFaint: '#8C8270',
      accent: '#8B1F1A',
      accentInk: '#FAF6E9',
      accentSoft: '#EAD3CF',
      ok: '#28583A',
      okSoft: '#D2DFC4',
      warn: '#9C6E0A',
      warnSoft: '#EDDFB5',
      // danger is a vivid "alarm red" clearly separable from the deep oxblood
      // accent (#8B1F1A) so a destructive/error state never reads as the primary
      // Sign action. Darkened from #C0392B so danger TEXT also clears AA on the
      // dangerSoft wash (badges render fg=danger on bg=dangerSoft, e.g. a failed
      // gear inspection). AA: bg 5.58 / surface 5.99 / on dangerSoft 4.85.
      danger: '#B22A1C',
      // Soft danger wash — warmer & more saturated than accentSoft's mauve
      // (#EAD3CF), so error backgrounds don't collide with accent backgrounds.
      dangerSoft: '#F4D9D2',
      chip: '#EBE5D3',
      chipText: '#1A1410',
      scrim: 'rgba(26,20,16,0.42)',
      shadow: '0 1px 0 #FAF6E9 inset, 0 2px 0 #1A1410, 0 0 0 1.5px #1A1410',
      ring: 'rgba(139,31,26,0.3)',
    },
  },
  'heliotype-dark': {
    key: 'heliotype-dark',
    name: 'Heliotype Dark',
    sub: 'Ink stock · oxblood',
    mode: 'dark',
    swatch: ['#1C1612', '#E6DCC4', '#E0594E'],
    tokens: {
      // Inverts Heliotype's paper→ink relationship: a warm dark "ink stock"
      // ground with the bone-paper colour now carrying the text, kept WARM for
      // the ink-on-paper feel rather than a cool/steel dark.
      bg: '#1C1612',
      surface: '#241C16',
      surface2: '#2D241B',
      surface3: '#382C20',
      // The stamped hard edge, inverted: `line` is now a bone hairline (was the
      // hard ink #1A1410 in light Heliotype); `lineSoft` stays warm-dark for
      // subtle dividers — mirroring the light palette's hard-line/soft-line split.
      line: '#E6DCC4',
      lineSoft: '#2A211A',
      // Bone paper as text. AA: text/bg 15.44, text/surface 14.45, textDim/bg 8.80.
      text: '#F3EEDF',
      textDim: '#C3B49B',
      // De-emphasised hint text — ≥3 (4.37 on bg).
      textFaint: '#8C7B63',
      // Oxblood brightened to stay legible on dark (accent/bg 4.87). accentInk is
      // dark warm ink so the button label clears AA on the bright fill (5.09).
      accent: '#E0594E',
      accentInk: '#1A1008',
      accentSoft: '#46221C',
      ok: '#7FC4A0',
      okSoft: '#22332A',
      warn: '#E0B45C',
      warnSoft: '#352A18',
      // Same danger≠accent rule: a cool pink-red alarm (hue ≈353°) clearly hue-
      // separated from the warm oxblood accent (hue ≈5°). AA: bg 5.57 / surface 5.21.
      danger: '#F25C6E',
      dangerSoft: '#3E1E22',
      chip: '#2D241B',
      chipText: '#D8C9AE',
      scrim: 'rgba(10,7,5,0.58)',
      // Letterpress shadow as a HARD, no-blur 3-part stack: subtle bone inset
      // highlight, a near-black warm drop ledge, and the 1.5px ring flipped from
      // black to bone — the stamped feel, adapted to dark stock.
      shadow: '0 1px 0 rgba(243,238,223,0.10) inset, 0 2px 0 #0E0A07, 0 0 0 1.5px #E6DCC4',
      ring: 'rgba(224,89,78,0.34)',
    },
  },
};

// Order shown in the Profile → Appearance picker.
export const THEME_ORDER: ThemeKey[] = ['heliotype', 'heliotype-dark'];

export const DEFAULT_THEME_KEY: ThemeKey = 'heliotype';

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && value in THEMES;
}

// The Heliotype family (light + dark) shares the stamped, letterpress
// "ink-on-paper" treatment — 1.5px hard borders and a no-blur drop ledge —
// applied at the primitive level (it is intentionally not encoded into
// `ThemeTokens`). Both shipping themes are in the family today; the helper is
// kept (rather than inlined) so the primitive branches read intentionally and a
// non-stamped theme could be reintroduced without touching every primitive. The
// hard edge colour comes from `tokens.line` (ink in light, bone in dark).
export function isHeliotypeFamily(key: ThemeKey): boolean {
  return key === 'heliotype' || key === 'heliotype-dark';
}
