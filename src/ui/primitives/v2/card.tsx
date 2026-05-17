import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';

export interface CardProps {
  children: React.ReactNode;
  padding?: number;
  interactive?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function Card({
  children,
  padding = 16,
  interactive,
  onPress,
  accessibilityLabel,
  style,
}: CardProps) {
  const { theme, tokens } = useTheme();
  const isHeliotype = theme.key === 'heliotype';
  const borderWidth = isHeliotype ? 1.5 : 1;
  const borderColor = isHeliotype ? tokens.line : tokens.lineSoft;

  const containerStyle: ViewStyle = {
    backgroundColor: tokens.surface,
    borderRadius: 18,
    borderWidth,
    borderColor,
    padding,
    ...style,
  };

  if (interactive || onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [
          containerStyle,
          pressed
            ? { transform: [{ scale: 0.99 }], borderColor: tokens.line }
            : null,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}
