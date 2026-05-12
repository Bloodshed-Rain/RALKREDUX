import React from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useReducedMotion } from '../animation/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';

interface PulleySpinnerProps {
  size?: number;
  color?: string;
  active?: boolean;
}

/**
 * M.2 Pulley sync — single-sheave spinner.
 * Sheave rotates 1.6s linear per the brand handoff. Compact form factor
 * (no housing or rope) tuned for use inside buttons.
 */
export function PulleySpinner({ size = 22, color, active = true }: PulleySpinnerProps) {
  const { tidewater } = useTheme();
  const reduced = useReducedMotion();
  const spin = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!active || reduced) {
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [active, reduced, spin]);

  const rotateDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ink = color ?? tidewater.ink;
  const c = size / 2;
  const r = size * 0.4;
  const hubR = Math.max(1.5, size * 0.07);
  const spokeLen = r * 0.78;
  const strokeWidth = Math.max(1.4, size * 0.08);

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityLabel="Syncing"
    >
      {/* Static sheave outer wheel + hub */}
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={c} cy={c} r={r} stroke={ink} strokeWidth={strokeWidth} fill="none" />
        <Circle cx={c} cy={c} r={hubR} fill={ink} />
      </Svg>
      {/* Rotating spokes */}
      <Animated.View
        style={{ width: size, height: size, transform: [{ rotate: rotateDeg }] }}
      >
        <Svg width={size} height={size}>
          {[0, 60, 120].map((deg) => (
            <Line
              key={deg}
              x1={c}
              y1={c - spokeLen / 2}
              x2={c}
              y2={c + spokeLen / 2}
              stroke={ink}
              strokeWidth={strokeWidth * 0.85}
              strokeLinecap="round"
              transform={`rotate(${deg} ${c} ${c})`}
            />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}
