export const colors = {
  bgApp: '#F8F6F1',
  bgSurface: '#FFFFFF',
  bgMuted: '#EFEBE3',
  border: '#D9D3C8',
  divider: '#E8E2D8',
  textPrimary: '#161616',
  textSecondary: '#5C5A55',
  textMuted: '#6F6A60',
  textInverse: '#FFFFFF',
  accentPrimary: '#A92323',
  accentPressed: '#861818',
  accentTint: '#F8E6E6',
  statusOk: '#166A39',
  statusWarn: '#8A4D00',
  statusErr: '#C62828',
  statusInfo: '#1F5C99',
  statusOkTint: '#E3F4EA',
  statusWarnTint: '#FFF2D8',
  statusErrTint: '#FCE4E4',
  statusInfoTint: '#E4EFFA',
  certL1: '#2563EB',
  certL2: '#D97706',
  certL3: '#15803D',
  overlay: 'rgba(0, 0, 0, 0.38)',
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
  title1: { fontFamily: 'Inter_600SemiBold', fontSize: 28, lineHeight: 34, fontWeight: '600' },
  title2: { fontFamily: 'Inter_600SemiBold', fontSize: 21, lineHeight: 28, fontWeight: '600' },
  title3: { fontFamily: 'Inter_600SemiBold', fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyMed: { fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 24, fontWeight: '500' },
  label: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16, fontWeight: '400' },
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  typography,
  touchTarget: { min: 44, preferred: 48 },
} as const;

export type Theme = typeof theme;
