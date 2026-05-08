import React from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../theme/theme-provider';

interface ScreenProps {
  children: React.ReactNode;
  padded?: boolean;
}

export function Screen({ children, padded = true }: ScreenProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgApp }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: padded ? spacing.base : 0,
          paddingVertical: spacing.base,
          gap: spacing.base,
        }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

