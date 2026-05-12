import React from 'react';
import { Trash2 } from 'lucide-react-native';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/theme-provider';

interface SwipeRowProps {
  children: React.ReactNode;
  open: boolean;
  onToggle: (open: boolean) => void;
  onDelete: () => void;
  actionLabel?: string;
  actionWidth?: number;
}

const DEFAULT_ACTION_WIDTH = 88;

export function SwipeRow({
  children,
  open,
  onToggle,
  onDelete,
  actionLabel = 'DELETE',
  actionWidth = DEFAULT_ACTION_WIDTH,
}: SwipeRowProps) {
  const { tidewater, typography } = useTheme();
  const translateX = React.useRef(new Animated.Value(0)).current;
  const openRef = React.useRef(open);

  React.useEffect(() => {
    openRef.current = open;
    Animated.spring(translateX, {
      toValue: open ? -actionWidth : 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  }, [actionWidth, open, translateX]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 8,
        onMoveShouldSetPanResponderCapture: (_evt, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 8,
        onPanResponderGrant: () => {
          translateX.stopAnimation();
        },
        onPanResponderMove: (_evt, gestureState) => {
          const base = openRef.current ? -actionWidth : 0;
          let next = base + gestureState.dx;
          if (next > 0) next = 0;
          if (next < -actionWidth - 24) next = -actionWidth - 24;
          translateX.setValue(next);
        },
        onPanResponderRelease: (_evt, gestureState) => {
          const final = (openRef.current ? -actionWidth : 0) + gestureState.dx;
          const shouldOpen = final < -actionWidth / 2 || gestureState.vx < -0.3;
          onToggle(shouldOpen);
        },
        onPanResponderTerminate: () => {
          onToggle(openRef.current);
        },
      }),
    [actionWidth, onToggle, translateX],
  );

  return (
    <View style={{ position: 'relative', overflow: 'hidden', backgroundColor: tidewater.red }}>
      {/* Right-side action revealed when row pulls left */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel.toLowerCase()} draft`}
        onPress={onDelete}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: actionWidth,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? tidewater.ink : tidewater.red,
          gap: 4,
        })}
      >
        <Trash2 size={18} color={tidewater.paper} strokeWidth={2.4} />
        <Text style={{ ...typography.displaySm, color: tidewater.paper, letterSpacing: 1.5 }}>
          {actionLabel}
        </Text>
      </Pressable>

      {/* Foreground content (slides on swipe) */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: [{ translateX }],
          backgroundColor: tidewater.paper,
        }}
      >
        {children}
        {/* When open, absorb taps on the row to close it instead of triggering the underlying row press */}
        {open ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close swipe action"
            onPress={() => onToggle(false)}
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}
