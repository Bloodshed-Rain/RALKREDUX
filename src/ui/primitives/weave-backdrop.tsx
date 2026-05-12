import React from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';
import { useReducedMotion } from '../animation/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';

interface WeaveBackdropProps {
  /** Tile edge length in px. Pattern repeats seamlessly along this size. */
  tile?: number;
  /** Override the stroke color. Default tidewater.ink. */
  color?: string;
  /** Override the layer opacity. Default 1 (lines already have their own opacity per the brand spec). */
  opacity?: number;
}

/**
 * M.6 Weave drift — drifting security weave for sensitive screens / splash.
 * Tile size, line opacities, and center-dot diameter mirror the brand-sheet
 * `PatternWeave`. Whole layer translates one tile-edge over 6s linear so the
 * drift loop wraps seamlessly.
 */
export function WeaveBackdrop({ tile = 20, color, opacity = 1 }: WeaveBackdropProps) {
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

  // Drift diagonally — both axes by one tile so the seamless wrap works in 2D.
  const translateX = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tile],
  });
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
          transform: [{ translateX }, { translateY }],
          // Extra room around the edges so the drift can shift without revealing the seam.
          top: -tile,
          bottom: -tile,
          left: -tile,
          right: -tile,
        },
      ]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="ralb-weave" x={0} y={0} width={tile} height={tile} patternUnits="userSpaceOnUse">
            {/* Two diagonal hairlines (NW→SE and SW→NE), bleeding past the tile edge so the cross stays seamless. */}
            <Line x1={-2} y1={tile + 2} x2={tile + 2} y2={-2} stroke={stroke} strokeWidth={0.5} opacity={0.18} />
            <Line x1={-2} y1={2} x2={tile + 2} y2={tile + 2} stroke={stroke} strokeWidth={0.5} opacity={0.18} />
            {/* Center dot for the weave junction. */}
            <Circle cx={tile / 2} cy={tile / 2} r={0.7} fill={stroke} opacity={0.42} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#ralb-weave)" />
      </Svg>
    </Animated.View>
  );
}
