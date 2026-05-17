import React from 'react';
import { Animated, Easing, View, Text, type ViewStyle, type TextStyle } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { useReducedMotion } from '@/src/ui/animation/use-reduced-motion';
import { IconBrand } from '@/src/ui/icons';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface SealAnimProps {
  // The chain hash short-form to print under the dial once sealing completes.
  hash?: string | null;
  // Fires when the dial finishes its outer-ring sweep (~1.4 s in). Useful
  // for the parent to begin "next step" prep, while the visual lock-state
  // continues briefly afterward.
  onSealed?: () => void;
}

const SIZE = 200;
const CENTER = SIZE / 2;
const RING_R = 92;
const RING_CIRCUM = 2 * Math.PI * RING_R;
const TICK_COUNT = 24;
const TICK_INNER_R = 78;
const TICK_OUTER_R = 86;
const STAMP_W = 88;
const STAMP_H = 72;

// Bespoke sealing animation. 200×200 circular dial with 24 ticks, an outer
// accent ring that draws over 1.4 s, and a center stamp that fills with the
// accent at completion. IconBrand reveals on completion. Captions transition
// "Sealing chain" → "Sealed in chain". Honors `useReducedMotion()` — when
// enabled, lands directly in the sealed state.
export function SealAnim({ hash, onSealed }: SealAnimProps) {
  const { tokens } = useTheme();
  const reduced = useReducedMotion();

  const ringDash = React.useRef(new Animated.Value(reduced ? 0 : RING_CIRCUM)).current;
  const stampOpacity = React.useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const brandOpacity = React.useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const [sealedVisually, setSealedVisually] = React.useState(reduced);

  React.useEffect(() => {
    if (reduced) {
      ringDash.setValue(0);
      stampOpacity.setValue(1);
      brandOpacity.setValue(1);
      setSealedVisually(true);
      onSealed?.();
      return;
    }
    ringDash.setValue(RING_CIRCUM);
    stampOpacity.setValue(0);
    brandOpacity.setValue(0);
    setSealedVisually(false);

    Animated.timing(ringDash, {
      toValue: 0,
      duration: 1400,
      easing: Easing.bezier(0.65, 0.05, 0.36, 1),
      useNativeDriver: false,
    }).start(() => {
      Animated.parallel([
        Animated.timing(stampOpacity, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(brandOpacity, {
          toValue: 1,
          duration: 280,
          delay: 120,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSealedVisually(true);
        onSealed?.();
      });
    });
  }, [reduced, ringDash, stampOpacity, brandOpacity, onSealed]);

  const captionStyle: TextStyle = {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.34,
    color: tokens.text,
    textAlign: 'center',
    marginTop: 24,
  };

  const hashStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_500Medium',
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    color: tokens.textDim,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.1,
  };

  const dialContainer: ViewStyle = {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const angle = (i / TICK_COUNT) * Math.PI * 2 - Math.PI / 2;
    return {
      x1: CENTER + Math.cos(angle) * TICK_INNER_R,
      y1: CENTER + Math.sin(angle) * TICK_INNER_R,
      x2: CENTER + Math.cos(angle) * TICK_OUTER_R,
      y2: CENTER + Math.sin(angle) * TICK_OUTER_R,
    };
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={dialContainer}>
        <Svg width={SIZE} height={SIZE}>
          {ticks.map((t, i) => (
            <Line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={tokens.lineSoft}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          ))}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RING_R}
            fill="none"
            stroke={tokens.lineSoft}
            strokeWidth={2}
          />
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RING_R}
            fill="none"
            stroke={tokens.accent}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={`${RING_CIRCUM}`}
            strokeDashoffset={ringDash}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
          />
        </Svg>

        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: STAMP_W,
            height: STAMP_H,
            borderRadius: 14,
            backgroundColor: tokens.accent,
            opacity: stampOpacity,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.View style={{ opacity: brandOpacity }}>
            <IconBrand size={36} color={tokens.accentInk} fill={tokens.accentInk} fillOpacity={0.18} />
          </Animated.View>
        </Animated.View>
      </View>

      <Text style={captionStyle}>{sealedVisually ? 'Sealed in chain' : 'Sealing chain…'}</Text>
      {hash ? <Text style={hashStyle}>{hash}</Text> : null}
    </View>
  );
}
