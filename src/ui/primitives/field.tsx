import React from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useTheme } from '../theme/theme-provider';

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
  invalid?: boolean;
}

export function Field({ label, hint, invalid = false, style, ...props }: FieldProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const accessoryId = React.useId().replace(/:/g, '');
  const inputAccessoryViewID = Platform.OS === 'ios'
    ? props.inputAccessoryViewID ?? `field-done-${accessoryId}`
    : undefined;
  const labelColor = invalid ? colors.statusWarn : colors.textPrimary;
  const hintColor = invalid ? colors.statusWarn : colors.textSecondary;

  return (
    <View style={{ gap: spacing.xs }}>
      <Text selectable style={{ ...typography.label, color: labelColor }}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        returnKeyType={props.returnKeyType ?? 'done'}
        blurOnSubmit={props.blurOnSubmit ?? !props.multiline}
        inputAccessoryViewID={inputAccessoryViewID}
        style={[
          {
            minHeight: 48,
            borderRadius: radii.sm,
            borderWidth: 1,
            borderColor: invalid ? colors.statusWarn : colors.border,
            backgroundColor: invalid ? colors.statusWarnTint : colors.bgSurface,
            color: colors.textPrimary,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            ...typography.body,
          },
          style,
        ]}
        {...props}
      />
      {Platform.OS === 'ios' && inputAccessoryViewID ? (
        <InputAccessoryView nativeID={inputAccessoryViewID}>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.bgSurface,
              alignItems: 'flex-end',
              paddingHorizontal: spacing.base,
              paddingVertical: spacing.sm,
            }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={Keyboard.dismiss}
              style={({ pressed }) => ({
                minHeight: 36,
                justifyContent: 'center',
                opacity: pressed ? 0.72 : 1,
                paddingHorizontal: spacing.md,
              })}
            >
              <Text selectable={false} style={{ ...typography.label, color: colors.accentPrimary }}>
                Done
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
      {hint ? (
        <Text selectable style={{ ...typography.caption, color: hintColor }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
