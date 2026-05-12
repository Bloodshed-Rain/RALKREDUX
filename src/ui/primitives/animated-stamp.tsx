import React from 'react';
import { Animated, Easing, Text } from 'react-native';
import { useReducedMotion } from '../animation/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';
import type { StampRotation, StampTone } from './stamp';

interface AnimatedStampProps {
  tone?: StampTone;
  rotation?: StampRotation | number;
  big?: boolean;
  children: string;
  /** Set false to skip the slam-in animation (renders settled state). */
  animate?: boolean;
}

const SLAM_EASING = Easing.bezier(0.2, 0.7, 0.3, 1.4);
const DURATIONS = {
  drop: 1870, // 0% → 55% of 3400ms
  squeeze: 238, // 55% → 62%
  rebound: 272, // 62% → 70%
  settle: 1020, // 70% → 100%
} as const;

/**
 * M.1 Stamp slam — total 3.4s.
 * Keyframes per the brand handoff:
 *  0%   translate(-50%, -200%) rotate(-22deg) scale(2.2) opacity 0
 *  55%  translate(-50%, -50%)  rotate(-7deg)  scale(1.05) opacity 1
 *  62%  scale 0.96
 *  70%  scale 1.00 opacity 0.95
 *  100% scale 1.00 opacity 0.78 (stamp.opacity)
 */
export function AnimatedStamp({
  tone = 'green',
  rotation = 'standard',
  big,
  children,
  animate = true,
}: AnimatedStampProps) {
  const { stamp, typography, spacing } = useTheme();
  const reduced = useReducedMotion();
  const shouldAnimate = animate && !reduced;
  const tintColor = stamp.tones[tone];
  const finalRotation = typeof rotation === 'number' ? rotation : stamp.rotation[rotation];

  const translateY = React.useRef(new Animated.Value(shouldAnimate ? -120 : 0)).current;
  const rotateProgress = React.useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;
  const scale = React.useRef(new Animated.Value(shouldAnimate ? 2.2 : 1)).current;
  const opacity = React.useRef(new Animated.Value(shouldAnimate ? 0 : stamp.opacity)).current;

  React.useEffect(() => {
    if (!shouldAnimate) {
      translateY.setValue(0);
      rotateProgress.setValue(1);
      scale.setValue(1);
      opacity.setValue(stamp.opacity);
      return;
    }
    Animated.sequence([
      // 0% → 55%: slam down to settled position
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: DURATIONS.drop,
          easing: SLAM_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(rotateProgress, {
          toValue: 1,
          duration: DURATIONS.drop,
          easing: SLAM_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.05,
          duration: DURATIONS.drop,
          easing: SLAM_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: DURATIONS.drop,
          easing: SLAM_EASING,
          useNativeDriver: true,
        }),
      ]),
      // 55% → 62%: scale squeeze
      Animated.timing(scale, {
        toValue: 0.96,
        duration: DURATIONS.squeeze,
        useNativeDriver: true,
      }),
      // 62% → 70%: scale back to 1, opacity easing toward final
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: DURATIONS.rebound,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.95,
          duration: DURATIONS.rebound,
          useNativeDriver: true,
        }),
      ]),
      // 70% → 100%: settle to stamp.opacity
      Animated.timing(opacity, {
        toValue: stamp.opacity,
        duration: DURATIONS.settle,
        useNativeDriver: true,
      }),
    ]).start();
  }, [finalRotation, opacity, rotateProgress, scale, shouldAnimate, stamp.opacity, translateY]);

  const rotateInterp = rotateProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-22deg', `${finalRotation}deg`],
  });

  return (
    <Animated.View
      style={{
        alignSelf: 'flex-start',
        borderWidth: stamp.borderWidth,
        borderColor: tintColor,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        opacity,
        transform: [{ translateY }, { rotate: rotateInterp }, { scale }],
      }}
    >
      <Text
        style={{
          ...typography.italicStamp,
          color: tintColor,
          fontSize: big ? 30 : typography.italicStamp.fontSize,
          lineHeight: big ? 32 : typography.italicStamp.lineHeight,
        }}
      >
        {children.toUpperCase()}
      </Text>
    </Animated.View>
  );
}
