import React from 'react';
import {
  TextInput,
  View,
  Text,
  type TextInputProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { isHeliotypeFamily } from '@/src/ui/theme/themes';

export interface FieldProps {
  label?: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
  helper?: string;
  // When set, the field renders an invalid state: a danger border plus this
  // message in danger text (overrides `helper`). Not color-only — the border
  // also thickens so the state reads on the ink-on-paper Heliotype palette.
  error?: string;
  // Border-only invalid state with no helper message — used to highlight an
  // empty *required* field without stacking a "Required" line under every blank
  // (the thicker danger border IS the signal). `error` takes precedence when
  // both are set. Announced to screen readers via the input's a11y label so the
  // state is not conveyed by color alone.
  invalid?: boolean;
  readOnly?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  secureTextEntry?: boolean;
  maxLength?: number;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  suffix,
  prefix,
  helper,
  error,
  invalid,
  readOnly,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  maxLength,
  accessibilityLabel,
  style,
}: FieldProps) {
  const { theme, tokens } = useTheme();
  const [focused, setFocused] = React.useState(false);
  const isHeliotype = isHeliotypeFamily(theme.key);

  const labelStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 1.5,
    color: tokens.textDim,
    textTransform: 'uppercase',
  };

  const hasError = !!error;
  // Both `error` and `invalid` paint the danger border; only `error` adds a
  // message line. Danger takes precedence over the focus ring so a required gap
  // stays red while the user is filling it, clearing once it's no longer empty.
  const showDanger = hasError || !!invalid;
  const rowBaseBorder = isHeliotype ? 1.5 : 1;
  const focusedBorder = focused || showDanger ? 1.5 : rowBaseBorder;
  const rowBorderColor = showDanger
    ? tokens.danger
    : focused
      ? tokens.accent
      : isHeliotype
        ? tokens.line
        : tokens.lineSoft;

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: multiline ? 'flex-start' : 'center',
    gap: 6,
    backgroundColor: tokens.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: focusedBorder,
    borderColor: rowBorderColor,
  };

  const inputStyle: TextStyle = {
    flex: 1,
    color: tokens.text,
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.15,
    paddingVertical: 0,
    textAlignVertical: multiline ? 'top' : 'center',
    minHeight: multiline ? 60 : undefined,
  };

  const helperStyle: TextStyle = {
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
    fontSize: 11,
    lineHeight: 14,
    color: tokens.textFaint,
    paddingLeft: 2,
  };

  const suffixStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: tokens.textDim,
  };

  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Text style={labelStyle}>{label}</Text> : null}
      <View style={rowStyle}>
        {prefix ? <View>{prefix}</View> : null}
        <TextInput
          accessibilityLabel={`${accessibilityLabel || label || placeholder || ''}${
            showDanger ? ', required' : ''
          }`}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={tokens.textFaint}
          multiline={multiline}
          editable={!readOnly}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          style={inputStyle}
          numberOfLines={multiline ? 3 : 1}
        />
        {suffix ? (
          typeof suffix === 'string' ? (
            <Text style={suffixStyle}>{suffix}</Text>
          ) : (
            <View>{suffix}</View>
          )
        ) : null}
      </View>
      {error ? (
        <Text style={[helperStyle, { color: tokens.danger }]}>{error}</Text>
      ) : helper ? (
        <Text style={helperStyle}>{helper}</Text>
      ) : null}
    </View>
  );
}
