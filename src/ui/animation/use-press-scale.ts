import React from 'react';
import { Animated, Pressable, type ViewStyle } from 'react-native';
import { useReducedMotion } from './use-reduced-motion';
import { press } from './motion';

// Pressable that can carry an animated transform on its own container style, so
// the whole surface (background + border + content) scales as one — no extra
// wrapper view, so existing layout/accessibility on the Pressable is untouched.
export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressScale {
  // 0 at rest, 1 fully pressed. Exposed so callers can build custom
  // interpolations off the same gesture (e.g. the FAB's scale + rotate).
  value: Animated.Value;
  onPressIn: () => void;
  onPressOut: () => void;
  // Drop-in style for an AnimatedPressable's style array. `null` under reduced
  // motion (no transform node at all). The ViewStyle cast is TS-only — the real
  // object still holds the Animated node, which AnimatedPressable reads.
  style: ViewStyle | null;
  reduced: boolean;
}

// Smooth, eased press feedback that replaces the instant `scale()` snap baked
// into Pressable's style-function. Snappy on the way down, a touch softer on
// release, both on the house curves. Honors reduced motion (no-op).
export function usePressScale(scale: number = press.scale.button): PressScale {
  const reduced = useReducedMotion();
  const value = React.useRef(new Animated.Value(0)).current;

  const onPressIn = React.useCallback(() => {
    if (reduced) return;
    Animated.timing(value, {
      toValue: 1,
      duration: press.inDuration,
      easing: press.inEasing,
      useNativeDriver: true,
    }).start();
  }, [reduced, value]);

  const onPressOut = React.useCallback(() => {
    if (reduced) return;
    Animated.timing(value, {
      toValue: 0,
      duration: press.outDuration,
      easing: press.outEasing,
      useNativeDriver: true,
    }).start();
  }, [reduced, value]);

  // Stop any in-flight press animation if the host unmounts mid-gesture (rapid
  // tab switch during a press, a virtualized row recycled while held), matching
  // the cleanup discipline in reveal.tsx / the tab focus animation.
  React.useEffect(() => () => value.stopAnimation(), [value]);

  const style = reduced
    ? null
    : ({
        transform: [
          { scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, scale] }) },
        ],
      } as unknown as ViewStyle);

  return { value, onPressIn, onPressOut, style, reduced };
}
