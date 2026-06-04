import React from 'react';
import { Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { scaled } from '@/src/ui/scale';
import { AnimatedPressable, usePressScale } from '@/src/ui/animation/use-press-scale';
import { press } from '@/src/ui/animation/motion';
import { IconChevron } from '@/src/ui/icons';
import type { GearStatus } from '@/src/domain/gear/types';

export interface GearRowProps {
  name: string;
  // Pre-composed identity + last-result line, e.g. "Petzl · A12 · Passed Apr 3".
  sub: string;
  // Days remaining (positive) / overdue (negative) / null when unscheduled.
  days: number | null;
  status: GearStatus;
  onPress?: () => void;
}

const CAPTION: Record<GearStatus, string> = {
  overdue: 'OVERDUE',
  due_soon: 'DUE',
  current: 'TO GO',
  unscheduled: 'NO DATE',
  retired: 'RETIRED',
};

// Compact gear row (EntryRow's anatomy): a leading inspection-countdown numeral,
// the identity/last-result line, and a left status rail. Urgency is carried by
// the rail color + the caption label (never colored body text on a soft fill),
// so it survives Heliotype's accent/danger hue collapse.
export function GearRow({ name, sub, days, status, onPress }: GearRowProps) {
  const { tokens } = useTheme();
  const pressScale = usePressScale(press.scale.row);

  const railColor =
    status === 'overdue'
      ? tokens.danger
      : status === 'due_soon'
        ? tokens.warn
        : status === 'current'
          ? tokens.ok
          : tokens.lineSoft;

  const muted = status === 'retired' || status === 'unscheduled';
  const numeral = muted || days == null ? '—' : String(Math.abs(days));
  const caption = days === 0 && !muted ? 'TODAY' : CAPTION[status];

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
    borderLeftWidth: 3,
    borderLeftColor: railColor,
  };

  // No type token for a hero numeral; scaled() keeps it in proportion with
  // UI_SCALE (the EntryRow day-numeral pattern).
  const numeralStyle: TextStyle = {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
    fontSize: scaled(22),
    lineHeight: scaled(24),
    letterSpacing: -0.6,
    color: muted ? tokens.textFaint : tokens.text,
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${caption.toLowerCase()}${numeral !== '—' ? ` ${numeral} days` : ''}`}
      onPress={onPress}
      onPressIn={pressScale.onPressIn}
      onPressOut={pressScale.onPressOut}
      style={[containerStyle, pressScale.style]}
    >
      <View style={{ width: 44, alignItems: 'center' }}>
        <Text style={numeralStyle}>{numeral}</Text>
        <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>{caption}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...type.cardTitle, color: tokens.text }} numberOfLines={1}>
          {name}
        </Text>
        <Text style={{ ...type.monoSm, color: tokens.textDim, marginTop: 2 }} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <IconChevron size={17} color={tokens.textFaint} />
    </AnimatedPressable>
  );
}
