import React from 'react';
import { Pressable, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { StatusPill, type EntryStatusKey } from './pill';
import { HashGlyph } from './hash-glyph';
import { IconChevron } from '@/src/ui/icons';

export interface EntryRowProps {
  status: EntryStatusKey;
  // ISO date string (YYYY-MM-DD) for the entry's date_to.
  date: string;
  site: string;
  task?: string;
  hours?: number;
  chainHash?: string | null;
  onPress?: () => void;
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

export function EntryRow({ status, date, site, task, hours, chainHash, onPress, action }: EntryRowProps) {
  const { tokens } = useTheme();
  const parsed = parseLocalDate(date);

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

  const dayStyle: TextStyle = {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.6,
    color: tokens.text,
  };

  const monthStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontWeight: '600',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.5,
    color: tokens.textFaint,
  };

  const titleStyle: TextStyle = {
    fontFamily: 'Manrope_600SemiBold',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.14,
    color: tokens.text,
  };

  const subStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    lineHeight: 14,
    color: tokens.textDim,
    marginTop: 2,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Entry on ${date} at ${site}`}
      onPress={onPress}
      style={({ pressed }) => [containerStyle, pressed ? { transform: [{ scale: 0.99 }] } : null]}
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
        {chainHash ? <HashGlyph hash={chainHash} size={24} /> : null}
        <StatusPill status={status} />
        {action}
        <IconChevron size={17} color={tokens.textFaint} />
      </View>
    </Pressable>
  );
}
