import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/theme-provider';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  const { colors, radii, spacing } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.bgSurface,
        borderColor: colors.border,
        borderRadius: radii.sm,
        borderWidth: 1,
        gap: spacing.md,
        overflow: 'hidden',
        padding: spacing.base,
        ...style,
      }}
    >
      {children}
    </View>
  );
}
