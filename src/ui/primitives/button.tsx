import React from 'react';
import { ActivityIndicator, Pressable, Text, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme/theme-provider';

interface ButtonProps {
  title: string;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  icon: Icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const { colors, radii, spacing, typography, touchTarget } = useTheme();
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const contentColor = disabled
    ? colors.textMuted
    : isPrimary
      ? colors.textInverse
      : colors.accentPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: touchTarget.preferred,
        borderRadius: radii.sm,
        paddingHorizontal: spacing.base,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing.sm,
        backgroundColor: disabled
          ? colors.bgMuted
          : isPrimary
            ? pressed
              ? colors.accentPressed
              : colors.accentPrimary
            : isGhost
              ? 'transparent'
              : colors.bgSurface,
        borderWidth: isPrimary || isGhost ? 0 : 1,
        borderColor: colors.border,
        opacity: disabled ? 0.7 : 1,
        ...style,
      })}
    >
      {loading ? <ActivityIndicator color={isPrimary ? colors.textInverse : colors.accentPrimary} /> : null}
      {!loading && Icon ? <Icon size={18} color={contentColor} strokeWidth={2.2} /> : null}
      <Text
        selectable={false}
        style={{
          ...typography.label,
          color: contentColor,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
