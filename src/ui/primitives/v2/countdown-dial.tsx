import React from 'react';
import { View, Text, type ViewStyle, type TextStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/src/ui/theme/theme-provider';

export type CountdownStatus = 'ok' | 'due_soon' | 'overdue' | 'unscheduled' | 'retired';

export interface CountdownDialProps {
  // Fraction of the inspection cycle elapsed, 0..1. Clamped internally.
  // Caller decides how to derive it (e.g. (today - last_inspection) / cycle).
  progress: number;
  status: CountdownStatus;
  // Days until next inspection. Negative = days overdue. null = no schedule.
  days: number | null;
  size?: number;
}

export function CountdownDial({ progress, status, days, size = 76 }: CountdownDialProps) {
  const { tokens } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);

  const palette =
    status === 'overdue'
      ? { fg: tokens.danger, bg: tokens.dangerSoft }
      : status === 'due_soon'
        ? { fg: tokens.warn, bg: tokens.warnSoft }
        : status === 'unscheduled' || status === 'retired'
          ? { fg: tokens.textFaint, bg: tokens.surface2 }
          : { fg: tokens.accent, bg: tokens.accentSoft };

  const center = size / 2;

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const valueStyle: TextStyle = {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: size >= 76 ? 22 : 18,
    lineHeight: size >= 76 ? 24 : 20,
    letterSpacing: -0.6,
    color: palette.fg,
  };

  const captionStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_500Medium',
    fontWeight: '500',
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 1,
    color: tokens.textDim,
    textTransform: 'uppercase',
    marginTop: 1,
  };

  let valueText: string;
  let captionText: string;
  if (days == null) {
    valueText = '—';
    captionText = status === 'retired' ? 'RETIRED' : 'NO DATE';
  } else if (days < 0) {
    valueText = `${Math.abs(days)}d`;
    captionText = 'OVERDUE';
  } else if (days === 0) {
    valueText = 'TODAY';
    captionText = 'DUE';
  } else {
    valueText = `${days}d`;
    captionText = 'TO GO';
  }

  return (
    <View style={containerStyle}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={palette.bg}
          strokeWidth={stroke}
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={palette.fg}
          strokeWidth={stroke}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <Text style={valueStyle}>{valueText}</Text>
      <Text style={captionStyle}>{captionText}</Text>
    </View>
  );
}
