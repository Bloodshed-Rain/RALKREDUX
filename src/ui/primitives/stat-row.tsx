import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/theme-provider';

interface StatRowProps {
  label: string;
  value: string;
}

export function StatRow({ label, value }: StatRowProps) {
  const { colors, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text selectable style={{ ...typography.body, color: colors.textSecondary, flex: 1 }}>
        {label}
      </Text>
      <Text
        selectable
        style={{
          ...typography.bodyMed,
          color: colors.textPrimary,
          fontVariant: ['tabular-nums'],
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

