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

export interface FieldProps {
  label?: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
  helper?: string;
  readOnly?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  secureTextEntry?: boolean;
  maxLength?: number;
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
  readOnly,
  keyboardType,
  autoCapitalize,
  autoComplete,
  secureTextEntry,
  maxLength,
  style,
}: FieldProps) {
  const { theme, tokens } = useTheme();
  const [focused, setFocused] = React.useState(false);
  const isHeliotype = theme.key === 'heliotype';

  const labelStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 1.5,
    color: tokens.textDim,
    textTransform: 'uppercase',
  };

  const rowBaseBorder = isHeliotype ? 1.5 : 1;
  const focusedBorder = focused ? 1.5 : rowBaseBorder;
  const rowBorderColor = focused
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
    paddingVertical: multiline ? 10 : 10,
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
          autoComplete={autoComplete}
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
      {helper ? <Text style={helperStyle}>{helper}</Text> : null}
    </View>
  );
}
