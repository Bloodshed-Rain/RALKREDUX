import React from 'react';
import { Animated, type ViewStyle } from 'react-native';
import { useReducedMotion } from './use-reduced-motion';
import { entrance } from './motion';

// Keys whose entrance has already played this session. Used so rows in a
// virtualized list animate once, on first appearance, and never again when the
// list recycles them back into view. Module scope = per app session — the same
// pattern records.tsx uses for its one-shot swipe hint (`swipeHintConsumed`).
const revealed = new Set<string>();

// Test/dev hook to reset the session reveal memory between renders.
export function __resetRevealMemory(): void {
  revealed.clear();
}

export interface RevealProps {
  children: React.ReactNode;
  // Stagger order within a screen/list batch. delay = min(index, cap) * step.
  index?: number;
  // When set, the entrance plays only the first time this key is ever seen.
  // Pass a stable item id for virtualized list rows so recycling — or a filter
  // toggle that re-mounts an already-seen row — never re-animates.
  dedupeKey?: string;
  style?: ViewStyle | ViewStyle[];
}

// Fade + rise a block into place on mount. One well-orchestrated reveal beats a
// dozen scattered micro-interactions, so this is the workhorse of the app's
// entrance choreography. Fires exactly once per mounted instance — never on
// re-render, and (because tab screens stay mounted) never on tab re-focus.
export function Reveal({ children, index = 0, dedupeKey, style }: RevealProps) {
  const reduced = useReducedMotion();
  // Decide once, at first render, whether this instance animates at all.
  const skip = React.useRef(reduced || (dedupeKey != null && revealed.has(dedupeKey)));
  const progress = React.useRef(new Animated.Value(skip.current ? 1 : 0)).current;

  React.useEffect(() => {
    if (skip.current) {
      progress.setValue(1);
      return;
    }
    if (dedupeKey != null) revealed.add(dedupeKey);
    const delay = Math.min(index, entrance.staggerCap) * entrance.stagger;
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: entrance.duration,
      delay,
      easing: entrance.easing,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // Mount-only on purpose: index/dedupeKey are fixed per instance, and the
    // entrance must not replay if the parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useReducedMotion resolves async (and can flip if the user toggles the OS
  // setting mid-session). If it turns on, stop and land immediately.
  React.useEffect(() => {
    if (reduced) {
      progress.stopAnimation();
      progress.setValue(1);
    }
  }, [reduced, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [entrance.offsetY, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
