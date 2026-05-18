import React from 'react';
import { Animated, PanResponder, Pressable, View } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { IconVoid } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';
import { scaled } from '@/src/ui/scale';

interface SwipeableRowProps {
  onDelete: () => void;
  // Plays a one-shot wiggle on mount so the swipe affordance is discoverable.
  // Callers should set this true for only the first eligible row of a session.
  hint?: boolean;
  children: React.ReactNode;
}

const REVEAL_WIDTH = 84;
const OPEN_THRESHOLD = 44;
const HINT_DISTANCE = 38;

export function SwipeableRow({ onDelete, hint, children }: SwipeableRowProps) {
  const { tokens } = useTheme();
  const translateX = React.useRef(new Animated.Value(0)).current;
  const isOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => {
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: -HINT_DISTANCE,
          duration: 360,
          useNativeDriver: true,
        }),
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          speed: 12,
          bounciness: 9,
        }),
      ]).start();
    }, 480);
    return () => clearTimeout(id);
  }, [hint, translateX]);

  const close = React.useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      speed: 22,
      bounciness: 6,
    }).start();
    isOpenRef.current = false;
  }, [translateX]);

  const open = React.useCallback(() => {
    Animated.spring(translateX, {
      toValue: -REVEAL_WIDTH,
      useNativeDriver: true,
      speed: 22,
      bounciness: 6,
    }).start();
    isOpenRef.current = true;
    haptics.impact('light');
  }, [translateX]);

  const responder = React.useMemo(
    () =>
      PanResponder.create({
        // Capture phase: parent steals the gesture from the child Pressable
        // once motion is clearly horizontal. Without this, the row's inner
        // Pressable claims the touch and the swipe never registers.
        onMoveShouldSetPanResponderCapture: (_evt, g) =>
          Math.abs(g.dx) > 10 && Math.abs(g.dy) < 14,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_evt, g) => {
          const base = isOpenRef.current ? -REVEAL_WIDTH : 0;
          const next = Math.max(-REVEAL_WIDTH * 1.08, Math.min(0, base + g.dx));
          translateX.setValue(next);
        },
        onPanResponderRelease: (_evt, g) => {
          if (isOpenRef.current) {
            if (g.dx > OPEN_THRESHOLD) close();
            else open();
          } else {
            if (g.dx < -OPEN_THRESHOLD) open();
            else close();
          }
        },
        onPanResponderTerminate: () => {
          // If something else stole the gesture (e.g. the parent ScrollView
          // claiming a vertical scroll), snap back to the resting state.
          if (!isOpenRef.current) close();
        },
      }),
    [translateX, close, open],
  );

  return (
    <View style={{ position: 'relative' }}>
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: REVEAL_WIDTH,
          backgroundColor: tokens.danger,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete draft"
          onPress={() => {
            onDelete();
            close();
          }}
          style={{
            width: REVEAL_WIDTH,
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconVoid size={scaled(22)} color={tokens.accentInk} />
        </Pressable>
      </View>
      <Animated.View {...responder.panHandlers} style={{ transform: [{ translateX }] }}>
        {children}
      </Animated.View>
    </View>
  );
}
