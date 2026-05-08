import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/theme-provider';

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
}

export function Field({ label, hint, style, ...props }: FieldProps) {
  const { colors, radii, spacing, typography } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          {
            minHeight: 48,
            borderRadius: radii.sm,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.bgSurface,
            color: colors.textPrimary,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            ...typography.body,
          },
          style,
        ]}
        {...props}
      />
      {hint ? (
        <Text selectable style={{ ...typography.caption, color: colors.textSecondary }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

