// v2 typography scale.
//
// Manrope for display/body/labels, JetBrains Mono for numbers / hashes /
// kicker labels, Newsreader 600 italic only for the signature scrawl moment.
// Letter-spacing values are converted from the handoff's CSS em values to RN
// points (em × fontSize).
//
// Theme-independent: palette swaps don't affect type.
//
// All numerical fields run through `scaled()` (rounded) or `scaledF()`
// (precise float for letterSpacing) so the global `UI_SCALE` constant in
// `src/ui/scale.ts` lifts every text size in one place. Original handoff
// values are kept as the argument to scaled() for legibility.

import type { TextStyle } from 'react-native';
import { scaled, scaledF } from '@/src/ui/scale';

export const type = {
  // Display — Manrope
  heroNumber: {
    fontFamily: 'Manrope_700Bold',
    fontSize: scaled(56),
    lineHeight: scaled(60),
    fontWeight: '700',
    letterSpacing: scaledF(-2.24),
  },
  screenTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: scaled(32),
    lineHeight: scaled(38),
    fontWeight: '800',
    letterSpacing: scaledF(-1.12),
  },
  heroCardTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: scaled(22),
    lineHeight: scaled(26),
    fontWeight: '800',
    letterSpacing: scaledF(-0.55),
  },
  sectionTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: scaled(18),
    lineHeight: scaled(22),
    fontWeight: '800',
    letterSpacing: scaledF(-0.36),
  },
  cardTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: scaled(14),
    lineHeight: scaled(18),
    fontWeight: '600',
    letterSpacing: scaledF(-0.14),
  },
  cardSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: scaled(12),
    lineHeight: scaled(16),
    fontWeight: '500',
  },
  body: {
    fontFamily: 'Manrope_500Medium',
    fontSize: scaled(14),
    lineHeight: scaled(20),
    fontWeight: '500',
    letterSpacing: scaledF(-0.14),
  },
  buttonLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: scaled(14),
    lineHeight: scaled(18),
    fontWeight: '600',
    letterSpacing: scaledF(-0.14),
  },

  // Mono — JetBrains Mono
  monoKicker: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: scaled(10),
    lineHeight: scaled(12),
    fontWeight: '600',
    letterSpacing: scaledF(1.6),
  },
  monoKickerLg: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: scaled(11),
    lineHeight: scaled(14),
    fontWeight: '600',
    letterSpacing: scaledF(1.98),
  },
  monoSm: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: scaled(10),
    lineHeight: scaled(14),
    fontWeight: '400',
    letterSpacing: scaledF(0.5),
  },
  mono: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: scaled(12),
    lineHeight: scaled(16),
    fontWeight: '400',
  },
  monoMd: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: scaled(14),
    lineHeight: scaled(18),
    fontWeight: '500',
  },
  monoLg: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: scaled(18),
    lineHeight: scaled(22),
    fontWeight: '600',
  },
  detailStat: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: scaled(20),
    lineHeight: scaled(24),
    fontWeight: '700',
    letterSpacing: scaledF(-0.4),
  },

  // Italic — Newsreader, signature scrawl only.
  signatureScrawl: {
    fontFamily: 'Newsreader_600SemiBold_Italic',
    fontSize: scaled(24),
    lineHeight: scaled(28),
    fontWeight: '600',
    fontStyle: 'italic',
    letterSpacing: scaledF(0.5),
  },
} satisfies Record<string, TextStyle>;

export type TypeKey = keyof typeof type;
