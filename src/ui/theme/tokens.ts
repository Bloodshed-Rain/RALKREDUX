export const tidewater = {
  ink: '#0b2545',
  ink2: '#1c3a64',
  ink3: '#5a6a83',
  paper: '#f6f3eb',
  paper2: '#efeae0',
  white: '#ffffff',
  yellow: '#f5c518',
  yellowDeep: '#c79a0a',
  yellowSoft: '#fbeec1',
  red: '#b32f1a',
  redSoft: '#f6dad2',
  green: '#1f7a3d',
  greenSoft: '#d2e5d4',
  hair: '#0b2545',
  hairSoft: 'rgba(11,37,69,0.22)',
  hairFaint: 'rgba(11,37,69,0.10)',
} as const;

export const colors = {
  bgApp: tidewater.paper,
  bgSurface: tidewater.white,
  bgMuted: tidewater.paper2,
  border: tidewater.hairSoft,
  divider: tidewater.hairFaint,
  textPrimary: tidewater.ink,
  textSecondary: tidewater.ink2,
  textMuted: tidewater.ink3,
  textInverse: tidewater.paper,
  accentPrimary: tidewater.yellow,
  accentPressed: tidewater.yellowDeep,
  accentTint: tidewater.yellowSoft,
  navBar: tidewater.ink,
  navBarActive: tidewater.yellow,
  statusOk: tidewater.green,
  statusWarn: tidewater.yellowDeep,
  statusErr: tidewater.red,
  statusInfo: tidewater.ink2,
  statusOkTint: tidewater.greenSoft,
  statusWarnTint: tidewater.yellowSoft,
  statusErrTint: tidewater.redSoft,
  statusInfoTint: 'rgba(11,37,69,0.08)',
  certL1: tidewater.yellow,
  certL2: tidewater.green,
  certL3: tidewater.ink,
  overlay: 'rgba(11,37,69,0.42)',
} as const;

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

export const typography = {
  // Inter-based — body, labels, generic titles (unchanged from prior tokens).
  title1: { fontFamily: 'Inter_600SemiBold', fontSize: 28, lineHeight: 34, fontWeight: '600' },
  title2: { fontFamily: 'Inter_600SemiBold', fontSize: 21, lineHeight: 28, fontWeight: '600' },
  title3: { fontFamily: 'Inter_600SemiBold', fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyMed: { fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 24, fontWeight: '500' },
  bodyBold: { fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 24, fontWeight: '700' },
  label: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16, fontWeight: '400' },

  // Archivo display — screen titles, all-caps form-name headers.
  displayXl: { fontFamily: 'Archivo_900Black', fontSize: 40, lineHeight: 42, fontWeight: '900', letterSpacing: -0.4 },
  displayLg: { fontFamily: 'Archivo_900Black', fontSize: 28, lineHeight: 32, fontWeight: '900', letterSpacing: -0.2 },
  displayMd: { fontFamily: 'Archivo_800ExtraBold', fontSize: 20, lineHeight: 24, fontWeight: '800', letterSpacing: 0 },
  displaySm: { fontFamily: 'Archivo_700Bold', fontSize: 14, lineHeight: 18, fontWeight: '700', letterSpacing: 1.2 },

  // IBM Plex Mono — form IDs, status chips, numbers.
  mono: { fontFamily: 'IBMPlexMono_400Regular', fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 1.2 },
  monoMd: { fontFamily: 'IBMPlexMono_500Medium', fontSize: 14, lineHeight: 18, fontWeight: '500', letterSpacing: 1 },
  monoLg: { fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 16, lineHeight: 20, fontWeight: '600', letterSpacing: 0.6 },
  monoSm: { fontFamily: 'IBMPlexMono_400Regular', fontSize: 10, lineHeight: 14, fontWeight: '400', letterSpacing: 1.5 },

  // Newsreader italic — stamps and signature flourish.
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

  // FORM nn-X · REV n · EFF YYYY.MM
  formNumber: { fontFamily: 'IBMPlexMono_500Medium', fontSize: 11, lineHeight: 14, fontWeight: '500', letterSpacing: 1.8 },
} as const;

export const hairlines = {
  standard: { width: 1, color: tidewater.hair },
  soft: { width: 1, color: tidewater.hairSoft },
  faint: { width: 1, color: tidewater.hairFaint },
} as const;

export const docBand = {
  top: {
    background: tidewater.ink,
    foreground: tidewater.paper,
    accent: tidewater.yellow,
  },
  footer: {
    background: tidewater.paper2,
    foreground: tidewater.ink2,
    border: tidewater.hair,
  },
} as const;

export const stamp = {
  rotation: {
    light: -3,
    standard: -6,
    heavy: -9,
    forward: 6,
  },
  opacity: 0.78,
  borderWidth: 2.5,
  tones: {
    green: tidewater.green,
    yellow: tidewater.yellowDeep,
    red: tidewater.red,
    ink: tidewater.ink,
    mute: tidewater.ink3,
  },
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  typography,
  touchTarget: { min: 44, preferred: 48 },
  tidewater,
  hairlines,
  docBand,
  stamp,
} as const;

export type Theme = typeof theme;
