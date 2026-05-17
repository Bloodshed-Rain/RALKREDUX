import React from 'react';
import { Text, type TextStyle } from 'react-native';
import { useReducedMotion } from '@/src/ui/animation/use-reduced-motion';

export interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (v: number) => string;
  style?: TextStyle | TextStyle[];
}

const defaultFormat = (v: number) => Math.round(v).toString();

export function AnimatedNumber({
  value,
  duration = 900,
  format = defaultFormat,
  style,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = React.useState(value);
  const prev = React.useRef(value);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (reduced || duration <= 0) {
      prev.current = value;
      setDisplay(value);
      return;
    }
    const from = prev.current;
    const to = value;
    if (from === to) return;
    const start = (globalThis.performance?.now?.() ?? Date.now());
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3); // cubic-out
      setDisplay(from + (to - from) * e);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        prev.current = to;
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [value, duration, reduced]);

  return (
    <Text
      selectable={false}
      style={[{ fontVariant: ['tabular-nums'] as ['tabular-nums'] }, style]}
    >
      {format(display)}
    </Text>
  );
}
