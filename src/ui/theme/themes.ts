// RALB Codex Edition — six interchangeable palettes.
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
  | 'sandstone'
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
      danger: '#8B1F1A',
      dangerSoft: '#EAD3CF',
      chip: '#EBE5D3',
      chipText: '#1A1410',
      scrim: 'rgba(26,20,16,0.42)',
      shadow: '0 1px 0 #FAF6E9 inset, 0 2px 0 #1A1410, 0 0 0 1.5px #1A1410',
      ring: 'rgba(139,31,26,0.3)',
    },
  },
  sandstone: {
    key: 'sandstone',
    name: 'Sandstone',
    sub: 'Canyon dust · terracotta',
    mode: 'light',
    swatch: ['#F0E5D3', '#D7BFA0', '#B5462C'],
    tokens: {
      bg: '#F0E5D3',
      surface: '#FBF3E2',
      surface2: '#E6D7BD',
      surface3: '#D7C39E',
      line: '#B89E78',
      lineSoft: '#DDCCAE',
      text: '#2C1E16',
      textDim: '#6E5640',
      textFaint: '#9E876C',
      accent: '#B5462C',
      accentInk: '#FBF3E2',
      accentSoft: '#EBC9B8',
      ok: '#4A6F36',
      okSoft: '#D4DDB8',
      warn: '#A66E0A',
      warnSoft: '#EDD8A6',
      danger: '#9E2A1F',
      dangerSoft: '#E8C2B7',
      chip: '#E6D7BD',
      chipText: '#2C1E16',
      scrim: 'rgba(44,30,22,0.42)',
      shadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 12px 28px -16px rgba(44,30,22,0.22)',
      ring: 'rgba(181,70,44,0.32)',
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
  'sandstone',
  'mercury',
];

export const DEFAULT_THEME_KEY: ThemeKey = 'tungsten';

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && value in THEMES;
}

export function getTheme(key: ThemeKey | string | null | undefined): Theme {
  if (isThemeKey(key)) return THEMES[key];
  return THEMES[DEFAULT_THEME_KEY];
}
