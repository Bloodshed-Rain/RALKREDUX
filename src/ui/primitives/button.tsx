import React from 'react';
import { ActivityIndicator, Pressable, Text, ViewStyle } from 'react-native';
import { useTheme } from '../theme/theme-provider';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const { colors, radii, spacing, typography, touchTarget } = useTheme();
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

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
      <Text
        selectable={false}
        style={{
          ...typography.label,
          color: disabled
            ? colors.textMuted
            : isPrimary
              ? colors.textInverse
              : colors.accentPrimary,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

