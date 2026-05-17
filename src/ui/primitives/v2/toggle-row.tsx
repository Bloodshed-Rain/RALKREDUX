import React from 'react';
import { Animated, Easing, Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { useReducedMotion } from '@/src/ui/animation/use-reduced-motion';
import { type } from '@/src/ui/theme/type';

export interface ToggleRowProps {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

const TRACK_W = 40;
const TRACK_H = 24;
const KNOB = 20;
const KNOB_TRAVEL = TRACK_W - KNOB - 4; // 16px slide

export function ToggleRow({ label, sub, value, onChange, disabled }: ToggleRowProps) {
  const { tokens } = useTheme();
  const reduced = useReducedMotion();
  const anim = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    if (reduced) {
      anim.setValue(value ? 1 : 0);
      return;
    }
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 200,
      easing: Easing.bezier(0.2, 0.7, 0.3, 1.4),
      useNativeDriver: false,
    }).start();
  }, [value, anim, reduced]);

  const trackBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [tokens.surface2, tokens.accent],
  });
  const knobLeft = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 2 + KNOB_TRAVEL],
  });

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: tokens.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.lineSoft,
    opacity: disabled ? 0.6 : 1,
  };

  const labelStyle: TextStyle = {
    ...type.cardTitle,
    color: tokens.text,
  };

  const subStyle: TextStyle = {
    ...type.cardSub,
    color: tokens.textDim,
    marginTop: 2,
  };

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      onPress={() => {
        if (disabled) return;
        onChange(!value);
      }}
      style={rowStyle}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={labelStyle} numberOfLines={1}>
          {label}
        </Text>
        {sub ? <Text style={subStyle}>{sub}</Text> : null}
      </View>
      <Animated.View
        style={{
          width: TRACK_W,
          height: TRACK_H,
          borderRadius: 999,
          backgroundColor: trackBg as unknown as string,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            top: 2,
            left: knobLeft as unknown as number,
            width: KNOB,
            height: KNOB,
            borderRadius: KNOB / 2,
            backgroundColor: tokens.bg,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 2,
            elevation: 1,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
