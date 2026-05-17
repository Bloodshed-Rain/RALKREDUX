import React from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { GEAR_ICON } from '@/src/ui/icons';
import type { GearCategory } from '@/src/domain/gear/types';
import { Pill, type PillTone } from './pill';

export interface GearCardProps {
  category: GearCategory;
  name: string;
  manufacturer?: string | null;
  serialNumber?: string | null;
  // Days remaining (positive) or days overdue (negative). null = no schedule.
  days: number | null;
  // Fraction of inspection cycle elapsed, 0..1. Drives the bottom progress bar.
  progress: number;
  status: 'ok' | 'due_soon' | 'overdue' | 'unscheduled' | 'retired';
  onPress?: () => void;
}

export function GearCard({
  category,
  name,
  manufacturer,
  serialNumber,
  days,
  progress,
  status,
  onPress,
}: GearCardProps) {
  const { tokens } = useTheme();
  const Icon = GEAR_ICON[category];
  const clamped = Math.max(0, Math.min(1, progress));

  const palette =
    status === 'overdue'
      ? { fg: tokens.danger, bar: tokens.danger }
      : status === 'due_soon'
        ? { fg: tokens.warn, bar: tokens.warn }
        : status === 'retired' || status === 'unscheduled'
          ? { fg: tokens.textFaint, bar: tokens.lineSoft }
          : { fg: tokens.ok, bar: tokens.accent };

  const tone: PillTone =
    status === 'overdue'
      ? 'danger'
      : status === 'due_soon'
        ? 'warn'
        : status === 'retired' || status === 'unscheduled'
          ? 'chip'
          : 'ok';

  const pillLabel =
    status === 'retired'
      ? 'Retired'
      : status === 'unscheduled'
        ? 'No date'
        : days == null
          ? '—'
          : days < 0
            ? `${Math.abs(days)}d overdue`
            : days === 0
              ? 'Due today'
              : `${days}d`;

  const cardStyle: ViewStyle = {
    backgroundColor: tokens.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.lineSoft,
    overflow: 'hidden',
  };

  const titleStyle: TextStyle = {
    ...type.cardTitle,
    color: tokens.text,
  };

  const subStyle: TextStyle = {
    ...type.monoSm,
    color: tokens.textDim,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${name}`}
      onPress={onPress}
      style={({ pressed }) => [
        cardStyle,
        pressed ? { transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: tokens.surface2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={26} color={tokens.text} fill={tokens.accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={titleStyle} numberOfLines={1}>
            {name}
          </Text>
          <Text style={subStyle} numberOfLines={1}>
            {[manufacturer, serialNumber, category].filter(Boolean).join(' · ') || category}
          </Text>
        </View>
        <Pill tone={tone} size="sm">{pillLabel}</Pill>
      </View>
      <View style={{ height: 4, backgroundColor: tokens.lineSoft }}>
        <View
          style={{
            width: `${clamped * 100}%`,
            height: '100%',
            backgroundColor: palette.bar,
          }}
        />
      </View>
    </Pressable>
  );
}
