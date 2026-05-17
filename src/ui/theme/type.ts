// v2 typography scale.
//
// Manrope for display/body/labels, JetBrains Mono for numbers / hashes /
// kicker labels, Newsreader 600 italic only for the signature scrawl moment.
// Letter-spacing values are converted from the handoff's CSS em values to RN
// points (em × fontSize).
//
// Theme-independent: palette swaps don't affect type.

import type { TextStyle } from 'react-native';

export const type = {
  // Display — Manrope
  heroNumber: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 56,
    lineHeight: 60,
    fontWeight: '700',
    letterSpacing: -2.24,
  },
  screenTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -1.12,
  },
  heroCardTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.55,
  },
  sectionTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: -0.36,
  },
  cardTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.14,
  },
  cardSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  body: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.14,
  },
  buttonLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.14,
  },

  // Mono — JetBrains Mono
  monoKicker: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    letterSpacing: 1.6,
  },
  monoKickerLg: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 1.98,
  },
  monoSm: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  mono: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  monoMd: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  monoLg: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
  },
  detailStat: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },

  // Italic — Newsreader, signature scrawl only.
  signatureScrawl: {
    fontFamily: 'Newsreader_600SemiBold_Italic',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '600',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
} satisfies Record<string, TextStyle>;

export type TypeKey = keyof typeof type;
