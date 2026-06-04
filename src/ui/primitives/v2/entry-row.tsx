import React from 'react';
import { Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { scaled } from '@/src/ui/scale';
import { AnimatedPressable, usePressScale } from '@/src/ui/animation/use-press-scale';
import { press } from '@/src/ui/animation/motion';
import { StatusPill, type EntryStatusKey } from './pill';
import { IconChevron } from '@/src/ui/icons';

export interface EntryRowProps {
  status: EntryStatusKey;
  // ISO date string (YYYY-MM-DD) for the entry's date_to.
  date: string;
  site: string;
  task?: string;
  hours?: number;
  onPress?: () => void;
  // Long-press on the row itself. Must live on the inner Pressable, otherwise
  // a child press handler claims the gesture before any wrapping Pressable
  // can detect the long-press timer.
  onLongPress?: () => void;
  // Optional trailing affordance — rendered between StatusPill and the
  // chevron in the right cluster. Caller provides an interactive element
  // (an IconBtn or Pressable); touch capture lives inside this slot so the
  // outer row press doesn't fire when the affordance is tapped.
  action?: React.ReactNode;
}

const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function parseLocalDate(iso: string): { day: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { day: Number(m[3]), month: Number(m[2]) };
}

export function EntryRow({ status, date, site, task, hours, onPress, onLongPress, action }: EntryRowProps) {
  const { tokens } = useTheme();
  const pressScale = usePressScale(press.scale.row);
  const parsed = parseLocalDate(date);
  const statusWord = status.charAt(0).toUpperCase() + status.slice(1);
  const dateWords = parsed ? `${MONTH_ABBR[parsed.month - 1]} ${parsed.day}` : date;
  // Fold status + hours into the label so a screen reader hears the row's
  // decision-critical attributes (the StatusPill text is otherwise suppressed
  // by this label on the accessible Pressable).
  const a11yLabel =
    `${statusWord} entry, ${site || 'untitled'}, ${dateWords}` +
    (hours != null ? `, ${hours.toFixed(1)} hours` : '');

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: tokens.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.lineSoft,
  };

  // Type tokens carry UI_SCALE; the day numeral has no token so it is scaled
  // explicitly to stay in proportion with the rest of the row.
  const dayStyle: TextStyle = {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
    fontSize: scaled(22),
    lineHeight: scaled(24),
    letterSpacing: -0.6,
    color: tokens.text,
  };

  const monthStyle: TextStyle = {
    ...type.monoKicker,
    color: tokens.textFaint,
  };

  const titleStyle: TextStyle = {
    ...type.cardTitle,
    color: tokens.text,
  };

  const subStyle: TextStyle = {
    ...type.monoSm,
    color: tokens.textDim,
    marginTop: 2,
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressScale.onPressIn}
      onPressOut={pressScale.onPressOut}
      style={[containerStyle, pressScale.style]}
    >
      <View style={{ width: 44, alignItems: 'center' }}>
        <Text style={dayStyle}>{parsed ? String(parsed.day).padStart(2, '0') : '—'}</Text>
        <Text style={monthStyle}>{parsed ? MONTH_ABBR[parsed.month - 1] : ''}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={titleStyle} numberOfLines={1}>
          {site || 'Untitled entry'}
        </Text>
        <Text style={subStyle} numberOfLines={1}>
          {[task, hours != null ? `${hours.toFixed(1)}h` : null]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <StatusPill status={status} />
        {action}
        <IconChevron size={17} color={tokens.textFaint} />
      </View>
    </AnimatedPressable>
  );
}
