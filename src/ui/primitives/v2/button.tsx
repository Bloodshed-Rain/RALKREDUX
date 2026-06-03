import React from 'react';
import { Pressable, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { scaled, scaledIcon } from '@/src/ui/scale';
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

// Text + icon dimensions run through scaled() to track the global UI_SCALE.
// Padding values stay verbatim — bigger text in the same padding box reads
// as comfortable, not bloated. borderRadius scaled to match larger pill.
const SIZES: Record<ButtonSize, SizeSpec> = {
  sm: { paddingVertical: 7, paddingHorizontal: 11, fontSize: scaled(13), lineHeight: scaled(16), borderRadius: scaled(10), iconSize: scaled(16) },
  md: { paddingVertical: 10, paddingHorizontal: 14, fontSize: scaled(14), lineHeight: scaled(18), borderRadius: scaled(12), iconSize: scaled(16) },
  lg: { paddingVertical: 14, paddingHorizontal: 18, fontSize: scaled(15), lineHeight: scaled(20), borderRadius: scaled(14), iconSize: scaled(20) },
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
  // The icon paints at scaledIcon(spec.iconSize) (ICON_SCALE applied inside
  // Icon/CustomIcon). Size the wrapper box to that rendered dimension and center
  // it, so the glyph sits centered in the row instead of overflowing top-left.
  const iconBox = scaledIcon(spec.iconSize);
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
      fg = tokens.accentInk;
      break;
  }

  // On Heliotype, accent and danger share the same oxblood — distinguish the
  // danger button by SHAPE: swap to outlined ink-on-bone (canvas-fill, oxblood
  // text, 1.5px oxblood ring) so it doesn't render identical to primary.
  if (isHeliotype && variant === 'danger') {
    bg = tokens.bg;
    fg = tokens.danger;
    borderWidth = 1.5;
    borderColor = tokens.danger;
  }

  // Heliotype primary AND danger get a 2px hard ink drop shadow (ink-on-paper
  // print feel). Danger keeps the shadow even when outlined.
  const heliotypeShadow: ViewStyle =
    isHeliotype && (variant === 'primary' || variant === 'danger')
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
        <View style={{ width: iconBox, height: iconBox, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={spec.iconSize} color={fg} fill={fg} fillOpacity={0.28} />
        </View>
      ) : null}
      <Text selectable={false} style={textStyle} numberOfLines={1}>
        {children}
      </Text>
      {IconRight ? (
        <View style={{ width: iconBox, height: iconBox, alignItems: 'center', justifyContent: 'center' }}>
          <IconRight size={spec.iconSize} color={fg} fill={fg} fillOpacity={0.28} />
        </View>
      ) : null}
    </Pressable>
  );
}
