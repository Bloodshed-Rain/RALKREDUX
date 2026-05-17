import React from 'react';
import { Pressable, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import type { IconProps } from '@/src/ui/icons';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type IconComp = React.ComponentType<IconProps>;

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconComp;
  iconRight?: IconComp;
  children: React.ReactNode;
  onPress?: () => void;
  full?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

interface SizeSpec {
  paddingVertical: number;
  paddingHorizontal: number;
  fontSize: number;
  lineHeight: number;
  borderRadius: number;
  iconSize: number;
}

const SIZES: Record<ButtonSize, SizeSpec> = {
  sm: { paddingVertical: 7, paddingHorizontal: 11, fontSize: 13, lineHeight: 16, borderRadius: 10, iconSize: 16 },
  md: { paddingVertical: 10, paddingHorizontal: 14, fontSize: 14, lineHeight: 18, borderRadius: 12, iconSize: 16 },
  lg: { paddingVertical: 14, paddingHorizontal: 18, fontSize: 15, lineHeight: 20, borderRadius: 14, iconSize: 20 },
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  children,
  onPress,
  full,
  disabled,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const { theme, tokens } = useTheme();
  const spec = SIZES[size];
  const isHeliotype = theme.key === 'heliotype';

  // Variant colors.
  let bg = 'transparent';
  let fg = tokens.text;
  let borderWidth = 0;
  let borderColor = 'transparent';
  switch (variant) {
    case 'primary':
      bg = tokens.accent;
      fg = tokens.accentInk;
      break;
    case 'secondary':
      bg = tokens.surface2;
      fg = tokens.text;
      break;
    case 'ghost':
      bg = 'transparent';
      fg = tokens.text;
      break;
    case 'outline':
      bg = 'transparent';
      fg = tokens.text;
      borderWidth = 1.5;
      borderColor = tokens.line;
      break;
    case 'danger':
      bg = tokens.danger;
      fg = '#FFFFFF';
      break;
  }

  // Heliotype primary gets a 2px hard ink drop shadow (ink-on-paper print feel).
  const heliotypeShadow: ViewStyle =
    isHeliotype && variant === 'primary'
      ? {
          shadowColor: '#1A1410',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 0,
        }
      : {};

  const containerStyle: ViewStyle = {
    paddingVertical: spec.paddingVertical,
    paddingHorizontal: spec.paddingHorizontal,
    borderRadius: spec.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: full ? 'stretch' : 'flex-start',
    backgroundColor: bg,
    borderWidth,
    borderColor,
    opacity: disabled ? 0.45 : 1,
    ...heliotypeShadow,
    ...style,
  };

  const textStyle: TextStyle = {
    ...type.buttonLabel,
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    color: fg,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        containerStyle,
        pressed && !disabled ? { transform: [{ scale: 0.97 }] } : null,
      ]}
    >
      {Icon ? (
        <View style={{ width: spec.iconSize, height: spec.iconSize }}>
          <Icon size={spec.iconSize} color={fg} fill={fg} fillOpacity={0.28} />
        </View>
      ) : null}
      <Text selectable={false} style={textStyle} numberOfLines={1}>
        {children}
      </Text>
      {IconRight ? (
        <View style={{ width: spec.iconSize, height: spec.iconSize }}>
          <IconRight size={spec.iconSize} color={fg} fill={fg} fillOpacity={0.28} />
        </View>
      ) : null}
    </Pressable>
  );
}
