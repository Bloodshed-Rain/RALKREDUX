import React from 'react';
import { View } from 'react-native';
import DateTimePicker, { useDefaultStyles, type DateType } from 'react-native-ui-datepicker';
import { InfoSheet } from './info-sheet';
import { Button } from './button';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { calendarDateToIso, isoToLocalDate, todayLocalIsoDate } from '@/src/domain/date-utils';

export interface DatePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  value: string | null; // ISO yyyy-mm-dd
  onChange: (iso: string | null) => void;
  minDate?: string | null; // ISO
  maxDate?: string | null; // ISO
  clearable?: boolean;
}

// Normalizes the library's DateType (Date | string | dayjs) to a JS Date.
function toDate(value: DateType): Date {
  if (value instanceof Date) return value;
  return new Date(value as unknown as number); // dayjs valueOf() / ISO string both work
}

export function DatePickerSheet({
  visible,
  onClose,
  title,
  value,
  onChange,
  minDate,
  maxDate,
  clearable = false,
}: DatePickerSheetProps) {
  const { tokens } = useTheme();
  const defaultStyles = useDefaultStyles();
  const [draftIso, setDraftIso] = React.useState<string | null>(value);

  React.useEffect(() => {
    if (visible) setDraftIso(value);
  }, [visible, value]);

  const themedStyles = React.useMemo(
    () => ({
      ...defaultStyles,
      today: { borderColor: tokens.accent, borderWidth: 1 },
      selected: { backgroundColor: tokens.accent },
      selected_label: { color: tokens.accentInk },
    }),
    [defaultStyles, tokens.accent, tokens.accentInk],
  );

  return (
    <InfoSheet visible={visible} onClose={onClose} title={title} kicker="PICK A DATE">
      <DateTimePicker
        mode="single"
        date={isoToLocalDate(draftIso) ?? undefined}
        onChange={({ date }) => setDraftIso(date ? calendarDateToIso(toDate(date)) : null)}
        minDate={isoToLocalDate(minDate) ?? undefined}
        maxDate={isoToLocalDate(maxDate) ?? undefined}
        styles={themedStyles}
      />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Button variant="ghost" size="sm" onPress={() => setDraftIso(todayLocalIsoDate())}>
          Today
        </Button>
        {clearable ? (
          <Button variant="ghost" size="sm" onPress={() => { onChange(null); onClose(); }}>
            Clear
          </Button>
        ) : null}
        <View style={{ flex: 1 }} />
        <Button variant="primary" size="sm" onPress={() => { onChange(draftIso); onClose(); }}>
          Done
        </Button>
      </View>
    </InfoSheet>
  );
}
