import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { isHeliotypeFamily } from '@/src/ui/theme/themes';
import { AnimatedPressable, usePressScale } from '@/src/ui/animation/use-press-scale';
import { press } from '@/src/ui/animation/motion';

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
  const pressScale = usePressScale(press.scale.card);
  const isHeliotype = isHeliotypeFamily(theme.key);
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
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onPressIn={pressScale.onPressIn}
        onPressOut={pressScale.onPressOut}
        style={[containerStyle, pressScale.style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}
