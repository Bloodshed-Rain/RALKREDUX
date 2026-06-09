// Rope Access Logbook — six interchangeable palettes.
// Verbatim from the v2 handoff. Every theme exports the same `ThemeTokens` shape;
// every primitive consumes `useTheme().tokens` rather than importing a static
// object, so swapping `setTheme(key)` re-skins the whole app in one render.

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

export type ThemeKey =
  | 'tungsten'
  | 'mariner'
  | 'verdigris'
  | 'heliotype'
  | 'heliotype-dark'
  | 'forge'
  | 'mercury';

export interface Theme {
  key: ThemeKey;
  name: string;
  sub: string;
  mode: ThemeMode;
  swatch: [string, string, string];
  tokens: ThemeTokens;
}

export const THEMES: Record<ThemeKey, Theme> = {
  tungsten: {
    key: 'tungsten',
    name: 'Tungsten',
    sub: 'Steel grey · muted orange',
    mode: 'dark',
    swatch: ['#2E353D', '#4E5862', '#D6804A'],
    tokens: {
      bg: '#1E232A',
      surface: '#262C34',
      surface2: '#2F3640',
      surface3: '#3A424D',
      line: '#424B57',
      lineSoft: '#2D343D',
      text: '#ECEEF1',
      textDim: '#A2ACB6',
      textFaint: '#6E7884',
      accent: '#E08F55',
      accentInk: '#1A0E06',
      accentSoft: '#4A3424',
      ok: '#8FC0A7',
      okSoft: '#2A3832',
      warn: '#DFB85E',
      warnSoft: '#3A3220',
      danger: '#E0695A',
      dangerSoft: '#3A221F',
      chip: '#2F3640',
      chipText: '#CCD3DA',
      scrim: 'rgba(10,14,18,0.72)',
      shadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 14px 32px -18px rgba(0,0,0,0.7)',
      ring: 'rgba(224,143,85,0.32)',
    },
  },
  mariner: {
    key: 'mariner',
    name: 'Mariner',
    sub: 'Deep navy · signal cyan',
    mode: 'dark',
    swatch: ['#131B2A', '#243553', '#5FB8FF'],
    tokens: {
      bg: '#131B2A',
      surface: '#1B2438',
      surface2: '#222D45',
      surface3: '#2D3A58',
      line: '#3A4868',
      lineSoft: '#222D45',
      text: '#E6ECF5',
      textDim: '#94A5C0',
      textFaint: '#5F7090',
      accent: '#5FB8FF',
      accentInk: '#0A1322',
      accentSoft: '#1F3552',
      ok: '#74D2A8',
      okSoft: '#1F3530',
      warn: '#FFCC4D',
      warnSoft: '#3A2F18',
      danger: '#F46A7A',
      dangerSoft: '#3A1E25',
      chip: '#222D45',
      chipText: '#BFCBE0',
      scrim: 'rgba(8,12,22,0.74)',
      shadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 16px 36px -20px rgba(0,0,0,0.7)',
      ring: 'rgba(95,184,255,0.34)',
    },
  },
  verdigris: {
    key: 'verdigris',
    name: 'Verdigris',
    sub: 'Patina · antique brass',
    mode: 'dark',
    swatch: ['#1B2723', '#2C3E36', '#D4AA5B'],
    tokens: {
      bg: '#1B2723',
      surface: '#23332D',
      surface2: '#2C3E36',
      surface3: '#374A41',
      line: '#42584D',
      lineSoft: '#2C3E36',
      text: '#E8E5D2',
      textDim: '#A6B3A2',
      textFaint: '#6F8079',
      accent: '#D4AA5B',
      accentInk: '#1A1206',
      accentSoft: '#403220',
      ok: '#88C29E',
      okSoft: '#243C32',
      warn: '#E0BD64',
      warnSoft: '#3C3320',
      danger: '#D0664F',
      dangerSoft: '#3A1F1B',
      chip: '#2C3E36',
      chipText: '#C6CFBE',
      scrim: 'rgba(10,16,14,0.74)',
      shadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 14px 32px -18px rgba(0,0,0,0.7)',
      ring: 'rgba(212,170,91,0.34)',
    },
  },
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
      // ground with the bone-paper colour now carrying the text, kept WARM so it
      // stays in the Heliotype family rather than the cool/steel dark themes.
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
      // Letterpress shadow preserved as a HARD, no-blur 3-part stack (not the soft
      // blur the other dark themes use): subtle bone inset highlight, a near-black
      // warm drop ledge, and the 1.5px ring flipped from black to bone.
      shadow: '0 1px 0 rgba(243,238,223,0.10) inset, 0 2px 0 #0E0A07, 0 0 0 1.5px #E6DCC4',
      ring: 'rgba(224,89,78,0.34)',
    },
  },
  forge: {
    key: 'forge',
    name: 'Forge',
    sub: 'Pumice · ember',
    mode: 'light',
    swatch: ['#F2E4CC', '#3A2A1F', '#DC5A28'],
    tokens: {
      bg: '#F2E4CC',
      surface: '#FBF1DC',
      surface2: '#E5D5B7',
      surface3: '#D6C39C',
      line: '#3A2A1F',
      lineSoft: '#C5B395',
      text: '#2A1F17',
      textDim: '#6B5A47',
      textFaint: '#A18E73',
      accent: '#DC5A28',
      // Bright ember kept as Forge's signature (distinct from Heliotype's deep
      // oxblood). accentInk is DARK ink, not cream, so the label clears WCAG AA
      // on the mid-tone ember fill (cream was 3.38; #1A0E06 is 4.99) — the
      // Tungsten dark-ink-on-bright-accent treatment, applied to a light palette.
      accentInk: '#1A0E06',
      accentSoft: '#F5D9C5',
      ok: '#28583A',
      okSoft: '#C8DCC4',
      warn: '#9C6E0A',
      warnSoft: '#EFDFB5',
      danger: '#A82F22',
      dangerSoft: '#EAD3CF',
      chip: '#E5D5B7',
      chipText: '#2A1F17',
      scrim: 'rgba(42,31,23,0.42)',
      shadow: '0 1px 0 rgba(255,255,255,0.85) inset, 0 12px 28px -16px rgba(58,42,31,0.22)',
      ring: 'rgba(220,90,40,0.32)',
    },
  },
  mercury: {
    key: 'mercury',
    name: 'Mercury',
    sub: 'Cool slate · electric violet',
    mode: 'light',
    swatch: ['#F0F1F5', '#D3D6E0', '#6B4FD8'],
    tokens: {
      bg: '#F0F1F5',
      surface: '#FFFFFF',
      surface2: '#E6E8EF',
      surface3: '#DADCE5',
      line: '#C2C5D2',
      lineSoft: '#E3E5ED',
      text: '#15171F',
      textDim: '#5E6376',
      textFaint: '#9498A6',
      accent: '#6B4FD8',
      accentInk: '#FFFFFF',
      accentSoft: '#E1DBF7',
      ok: '#207659',
      okSoft: '#D3E5DD',
      warn: '#B07914',
      warnSoft: '#F0E2BC',
      danger: '#B83342',
      dangerSoft: '#F2D5D9',
      chip: '#E6E8EF',
      chipText: '#3D4258',
      scrim: 'rgba(21,23,31,0.42)',
      shadow: '0 1px 0 rgba(255,255,255,0.95) inset, 0 12px 30px -18px rgba(21,23,31,0.16)',
      ring: 'rgba(107,79,216,0.3)',
    },
  },
};

// Order shown in the Profile → Appearance picker.
export const THEME_ORDER: ThemeKey[] = [
  'tungsten',
  'mariner',
  'verdigris',
  'heliotype',
  'heliotype-dark',
  'forge',
  'mercury',
];

export const DEFAULT_THEME_KEY: ThemeKey = 'tungsten';

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && value in THEMES;
}

// The Heliotype family (light + dark) shares the stamped, letterpress
// "ink-on-paper" treatment — 1.5px hard borders and a no-blur drop ledge —
// applied at the primitive level (it is intentionally not encoded into
// `ThemeTokens`). Primitives branch on this rather than a single key so the
// dark sibling inherits the same identity. The hard edge colour comes from
// `tokens.line` (ink in light, bone in dark), so callers don't hard-code it.
export function isHeliotypeFamily(key: ThemeKey): boolean {
  return key === 'heliotype' || key === 'heliotype-dark';
}
