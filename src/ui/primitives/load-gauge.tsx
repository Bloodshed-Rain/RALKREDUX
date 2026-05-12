import React from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useReducedMotion } from '../animation/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';

interface LoadGaugeProps {
  /** 0–1 value; needle sweeps from -90° at 0 to +90° at 1. */
  value: number;
  size?: number;
  /** Optional label centered below the gauge. */
  label?: string;
  /** Override which color zones are drawn (defaults: red 0–0.33, yellow 0.33–0.66, green 0.66–1). */
  zones?: Array<{ from: number; to: number; color: string }>;
  /** Animation duration in ms. Default 3600 per spec. */
  duration?: number;
}

/**
 * M.7 Load gauge — semicircular needle gauge through green/yellow/red zones.
 * 3.6s ease-in-out per the brand handoff.
 */
export function LoadGauge({ value, size = 96, label, zones, duration = 3600 }: LoadGaugeProps) {
  const { tidewater, typography } = useTheme();
  const reduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, value));
  const needle = React.useRef(new Animated.Value(reduced ? clamped : 0)).current;

  React.useEffect(() => {
    if (reduced) {
      needle.setValue(clamped);
      return;
    }
    needle.setValue(0);
    const anim = Animated.timing(needle, {
      toValue: clamped,
      duration,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => {
      anim.stop();
    };
  }, [clamped, duration, needle, reduced]);

  const resolvedZones = zones ?? [
    { from: 0, to: 0.33, color: tidewater.red },
    { from: 0.33, to: 0.66, color: tidewater.yellowDeep },
    { from: 0.66, to: 1, color: tidewater.green },
  ];

  // Geometry — semicircle that takes the top half of an SVG viewBox.
  const width = size;
  const height = Math.round(size * 0.62);
  const cx = width / 2;
  const cy = height - 8; // baseline near the bottom edge
  const r = Math.min(cx, cy) - 6;
  const hubR = Math.max(3, size * 0.05);

  function pointOnArc(t: number) {
    // t = 0..1 maps to angle -90°..+90° (sin -1..+1, cos 0..0)
    const angle = (t - 0.5) * Math.PI; // -90deg .. +90deg in radians (0 at top)
    const x = cx + r * Math.sin(angle);
    const y = cy - r * Math.cos(angle);
    return { x, y };
  }

  function arcPath(from: number, to: number): string {
    const start = pointOnArc(from);
    const end = pointOnArc(to);
    const sweep = 1;
    const largeArc = to - from > 0.5 ? 1 : 0;
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }

  const rotateDeg = needle.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '90deg'],
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'flex-start', width }}>
      <View style={{ width, height }}>
        <Svg width={width} height={height}>
          {/* Background track */}
          <Path
            d={arcPath(0, 1)}
            stroke={tidewater.paper2}
            strokeWidth={6}
            strokeLinecap="butt"
            fill="none"
          />
          {/* Colored zones layered on top */}
          {resolvedZones.map((zone, i) => (
            <Path
              key={i}
              d={arcPath(zone.from, zone.to)}
              stroke={zone.color}
              strokeWidth={6}
              strokeLinecap="butt"
              fill="none"
              opacity={0.92}
            />
          ))}
          {/* Tick marks at the zone boundaries */}
          {[0, 0.33, 0.66, 1].map((t, i) => {
            const inner = (() => {
              const a = (t - 0.5) * Math.PI;
              const ir = r - 9;
              return { x: cx + ir * Math.sin(a), y: cy - ir * Math.cos(a) };
            })();
            const outer = pointOnArc(t);
            return (
              <Path
                key={`tick-${i}`}
                d={`M ${inner.x.toFixed(2)} ${inner.y.toFixed(2)} L ${outer.x.toFixed(2)} ${outer.y.toFixed(2)}`}
                stroke={tidewater.ink}
                strokeWidth={1}
                opacity={0.55}
              />
            );
          })}
        </Svg>
        {/* Needle (rotated via Animated.View) */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: cx - 1,
            top: 6,
            width: 2,
            height: cy - 6,
            backgroundColor: tidewater.ink,
            transformOrigin: '50% 100%',
            transform: [{ rotate: rotateDeg }],
          }}
        />
        {/* Hub */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: cx - hubR,
            top: cy - hubR,
            width: hubR * 2,
            height: hubR * 2,
          }}
        >
          <Svg width={hubR * 2} height={hubR * 2}>
            <Circle cx={hubR} cy={hubR} r={hubR} fill={tidewater.ink} />
            <Circle cx={hubR} cy={hubR} r={hubR * 0.35} fill={tidewater.paper} />
          </Svg>
        </View>
      </View>
      {label ? (
        <Text
          style={{
            ...typography.monoSm,
            color: tidewater.ink3,
            letterSpacing: 1.5,
            marginTop: 4,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}
