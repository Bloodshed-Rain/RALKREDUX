import React from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { IconCalendar } from '@/src/ui/icons';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { formatIsoForDisplay } from '@/src/domain/date-utils';
import { DatePickerSheet } from './date-picker-sheet';

export interface DateFieldProps {
  label?: string;
  value: string | null; // ISO yyyy-mm-dd
  onChange: (iso: string | null) => void;
  placeholder?: string;
  helper?: string;
  minDate?: string | null;
  maxDate?: string | null;
  clearable?: boolean;
  title?: string; // sheet title; defaults to label
}

export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  helper,
  minDate,
  maxDate,
  clearable = false,
  title,
}: DateFieldProps) {
  const { theme, tokens } = useTheme();
  const [open, setOpen] = React.useState(false);
  const isHeliotype = theme.key === 'heliotype';
  const display = formatIsoForDisplay(value);

  const labelStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 1.5,
    color: tokens.textDim,
    textTransform: 'uppercase',
  };

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: isHeliotype ? 1.5 : 1,
    borderColor: isHeliotype ? tokens.line : tokens.lineSoft,
  };

  const valueStyle: TextStyle = {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.15,
    color: display ? tokens.text : tokens.textFaint,
  };

  const helperStyle: TextStyle = {
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
    fontSize: 11,
    lineHeight: 14,
    color: tokens.textFaint,
    paddingLeft: 2,
  };

  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={labelStyle}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? title ?? 'Date'}: ${display ?? 'not set'}`}
        style={({ pressed }) => [rowStyle, pressed ? { transform: [{ scale: 0.99 }] } : null]}
      >
        <Text style={valueStyle}>{display ?? placeholder}</Text>
        <IconCalendar size={18} color={tokens.textDim} />
      </Pressable>
      {helper ? <Text style={helperStyle}>{helper}</Text> : null}
      <DatePickerSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={title ?? label ?? 'Select date'}
        value={value}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
        clearable={clearable}
      />
    </View>
  );
}
