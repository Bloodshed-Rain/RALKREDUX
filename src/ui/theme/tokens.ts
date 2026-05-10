export const brandColors = {
  carbonBlack: '#222121',
  forestGreen: '#398F30',
  dustGrey: '#CACCC5',
  spaceIndigo: '#1D2B46',
} as const;

export const colors = {
  bgApp: brandColors.dustGrey,
  bgSurface: '#F7F8F4',
  bgMuted: '#E2E4DD',
  border: '#AEB3A9',
  divider: '#BEC3BA',
  textPrimary: brandColors.carbonBlack,
  textSecondary: '#3C4556',
  textMuted: '#646A62',
  textInverse: '#FFFFFF',
  accentPrimary: brandColors.forestGreen,
  accentPressed: '#2D7127',
  accentTint: '#E1F0DE',
  navBar: brandColors.spaceIndigo,
  navBarActive: brandColors.dustGrey,
  statusOk: brandColors.forestGreen,
  statusWarn: '#8A5A00',
  statusErr: '#A63A34',
  statusInfo: brandColors.spaceIndigo,
  statusOkTint: '#E1F0DE',
  statusWarnTint: '#F6E8C9',
  statusErrTint: '#F3DAD7',
  statusInfoTint: '#E2E7F0',
  certL1: brandColors.spaceIndigo,
  certL2: brandColors.forestGreen,
  certL3: brandColors.carbonBlack,
  overlay: 'rgba(34, 33, 33, 0.42)',
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
