import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../theme/theme-provider';

interface CheckboxRowProps {
  checked: boolean;
  label: string;
  hint?: string;
  onChange: (checked: boolean) => void;
}

export function CheckboxRow({ checked, label, hint, onChange }: CheckboxRowProps) {
  const { colors, radii, spacing, typography, touchTarget } = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => ({
        minHeight: touchTarget.min,
        borderRadius: radii.sm,
        flexDirection: 'row',
        gap: spacing.md,
        opacity: pressed ? 0.82 : 1,
      })}
    >
      <View
        style={{
          width: 24,
          height: 24,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radii.xs,
          borderWidth: 1,
          borderColor: checked ? colors.accentPrimary : colors.border,
          backgroundColor: checked ? colors.accentPrimary : colors.bgSurface,
        }}
      >
        {checked ? <Check color={colors.textInverse} size={16} strokeWidth={2.4} /> : null}
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text selectable={false} style={{ ...typography.bodyMed, color: colors.textPrimary }}>
          {label}
        </Text>
        {hint ? (
          <Text selectable style={{ ...typography.caption, color: colors.textSecondary }}>
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
