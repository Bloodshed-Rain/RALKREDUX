import React from 'react';
import { Pressable, Text, View, Animated, Easing, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { IconCheck, IconSync, IconOffline } from '@/src/ui/icons';

export type SyncChipState = 'synced' | 'syncing' | 'queued' | 'offline';

export interface SyncChipProps {
  state: SyncChipState;
  count?: number;
  onPress?: () => void;
}

interface ToneSpec {
  label: (count: number) => string;
  bg: string;
  fg: string;
  Icon: React.ComponentType<{ size?: number; color?: string; fill?: string }>;
  spin?: boolean;
}

function spec(state: SyncChipState, tokens: ReturnType<typeof useTheme>['tokens']): ToneSpec {
  switch (state) {
    case 'syncing':
      return {
        label: () => 'Syncing…',
        bg: tokens.accentSoft,
        fg: tokens.accent,
        Icon: IconSync,
        spin: true,
      };
    case 'queued':
      return {
        label: (c) => `Queued · ${c}`,
        bg: tokens.warnSoft,
        fg: tokens.warn,
        Icon: IconSync,
      };
    case 'offline':
      return {
        label: () => 'Offline',
        bg: tokens.dangerSoft,
        fg: tokens.danger,
        Icon: IconOffline,
      };
    case 'synced':
    default:
      return {
        label: () => 'Synced',
        bg: tokens.okSoft,
        fg: tokens.ok,
        Icon: IconCheck,
      };
  }
}

export function SyncChip({ state, count = 0, onPress }: SyncChipProps) {
  const { tokens } = useTheme();
  const s = spec(state, tokens);
  const rotation = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!s.spin) {
      rotation.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [s.spin, rotation]);

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    paddingLeft: 8,
    borderRadius: 999,
    backgroundColor: s.bg,
    alignSelf: 'flex-start',
  };

  const labelStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.1,
    color: s.fg,
  };

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const body = (
    <View style={containerStyle}>
      <Animated.View style={{ width: 14, height: 14, transform: s.spin ? [{ rotate: spin }] : undefined }}>
        <s.Icon size={14} color={s.fg} fill={s.fg} />
      </Animated.View>
      <Text selectable={false} style={labelStyle}>
        {s.label(count)}
      </Text>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sync status: ${state}`}
      onPress={onPress}
      style={({ pressed }) => (pressed ? { transform: [{ scale: 0.97 }] } : null)}
    >
      {body}
    </Pressable>
  );
}
