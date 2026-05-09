import React from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays, X } from 'lucide-react-native';
import { Platform, Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/theme-provider';

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  invalid?: boolean;
  optional?: boolean;
}

function todayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseIsoDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return todayLocal();
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return todayLocal();
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DateField({
  label,
  value,
  onChange,
  hint,
  placeholder = 'Select date',
  invalid = false,
  optional = false,
}: DateFieldProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const [open, setOpen] = React.useState(false);
  const labelColor = invalid ? colors.statusWarn : colors.textPrimary;
  const hintColor = invalid ? colors.statusWarn : colors.textSecondary;
  const selectedDate = parseIsoDate(value);
  const showPicker = open && (Platform.OS === 'ios' || Platform.OS === 'android');

  return (
    <View style={{ gap: spacing.xs }}>
      <Text selectable style={{ ...typography.label, color: labelColor }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen((current) => !current)}
          style={({ pressed }) => ({
            minHeight: 48,
            flex: 1,
            borderRadius: radii.sm,
            borderWidth: 1,
            borderColor: invalid ? colors.statusWarn : colors.border,
            backgroundColor: invalid ? colors.statusWarnTint : colors.bgSurface,
            opacity: pressed ? 0.82 : 1,
            paddingHorizontal: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          })}
        >
          <CalendarDays size={18} color={invalid ? colors.statusWarn : colors.textSecondary} strokeWidth={2.2} />
          <Text
            selectable={false}
            numberOfLines={1}
            style={{
              ...typography.body,
              color: value ? colors.textPrimary : colors.textMuted,
              flex: 1,
            }}
          >
            {value || placeholder}
          </Text>
        </Pressable>
        {optional && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            onPress={() => onChange('')}
            style={({ pressed }) => ({
              width: 48,
              minHeight: 48,
              borderRadius: radii.sm,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.bgSurface,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <X size={18} color={colors.textSecondary} strokeWidth={2.2} />
          </Pressable>
        ) : null}
      </View>
      {showPicker ? (
        <View
          style={{
            borderRadius: radii.sm,
            borderWidth: Platform.OS === 'ios' ? 1 : 0,
            borderColor: colors.border,
            backgroundColor: colors.bgSurface,
            overflow: 'hidden',
          }}
        >
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, date) => {
              if (Platform.OS !== 'ios') setOpen(false);
              if (date) onChange(toIsoDate(date));
            }}
          />
        </View>
      ) : null}
      {hint ? (
        <Text selectable style={{ ...typography.caption, color: hintColor }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
