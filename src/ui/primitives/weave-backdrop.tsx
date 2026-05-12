import React from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';
import { useReducedMotion } from '../animation/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';

interface WeaveBackdropProps {
  /** Tile edge length in px. Pattern repeats seamlessly along this size. */
  tile?: number;
  /** Opacity of the entire weave layer. Default 0.04 — barely perceptible. */
  opacity?: number;
  /** Override the stroke color. Default tidewater.ink. */
  color?: string;
}

/**
 * M.6 Weave drift — tiled cross-hatch that drifts vertically over 6s linear.
 * Renders as an absolute-positioned, non-interactive overlay. Pattern is sized
 * so the drift loop wraps seamlessly.
 */
export function WeaveBackdrop({ tile = 24, opacity = 0.04, color }: WeaveBackdropProps) {
  const { tidewater } = useTheme();
  const reduced = useReducedMotion();
  const drift = React.useRef(new Animated.Value(0)).current;
  const stroke = color ?? tidewater.ink;

  React.useEffect(() => {
    if (reduced) {
      drift.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [drift, reduced]);

  const translateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tile],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          opacity,
          transform: [{ translateY }],
          // Extra room top + bottom so the drift can shift without revealing edges.
          top: -tile,
          bottom: -tile,
        },
      ]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="ralb-weave" x={0} y={0} width={tile} height={tile} patternUnits="userSpaceOnUse">
            <Line x1={0} y1={0} x2={tile} y2={tile} stroke={stroke} strokeWidth={0.6} />
            <Line x1={0} y1={tile} x2={tile} y2={0} stroke={stroke} strokeWidth={0.4} opacity={0.6} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#ralb-weave)" />
      </Svg>
    </Animated.View>
  );
}
