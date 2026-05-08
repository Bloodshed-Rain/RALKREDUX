import React from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../theme/theme-provider';

interface ScreenProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  padded?: boolean;
}

export function Screen({ children, footer, padded = true }: ScreenProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgApp }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: padded ? spacing.base : 0,
          paddingVertical: spacing.base,
          paddingBottom: footer ? spacing.xxl : spacing.base,
          gap: spacing.base,
        }}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.bgSurface,
            paddingHorizontal: spacing.base,
            paddingTop: spacing.sm,
            paddingBottom: spacing.base,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}
