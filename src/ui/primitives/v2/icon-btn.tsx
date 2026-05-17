import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import type { IconProps } from '@/src/ui/icons';

export type IconBtnSize = 'sm' | 'md' | 'lg';

export interface IconBtnProps {
  icon: React.ComponentType<IconProps>;
  label: string;
  onPress?: () => void;
  size?: IconBtnSize;
  tone?: 'text' | 'accent' | 'ok' | 'warn' | 'danger' | 'textDim';
  disabled?: boolean;
  style?: ViewStyle;
}

const SIZES: Record<IconBtnSize, { box: number; icon: number; radius: number }> = {
  sm: { box: 28, icon: 16, radius: 8 },
  md: { box: 36, icon: 20, radius: 10 },
  lg: { box: 44, icon: 24, radius: 12 },
};

export function IconBtn({
  icon: Icon,
  label,
  onPress,
  size = 'md',
  tone = 'text',
  disabled,
  style,
}: IconBtnProps) {
  const { tokens } = useTheme();
  const spec = SIZES[size];
  const color =
    tone === 'accent'
      ? tokens.accent
      : tone === 'ok'
        ? tokens.ok
        : tone === 'warn'
          ? tokens.warn
          : tone === 'danger'
            ? tokens.danger
            : tone === 'textDim'
              ? tokens.textDim
              : tokens.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: spec.box,
          height: spec.box,
          borderRadius: spec.radius,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed && !disabled ? tokens.surface2 : 'transparent',
          opacity: disabled ? 0.45 : 1,
          transform: pressed && !disabled ? [{ scale: 0.94 }] : undefined,
        },
        style,
      ]}
    >
      <View style={{ width: spec.icon, height: spec.icon }}>
        <Icon size={spec.icon} color={color} />
      </View>
    </Pressable>
  );
}
