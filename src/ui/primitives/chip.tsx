import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/theme-provider';

export type ChipTone = 'ink' | 'green' | 'yellow' | 'red' | 'mute';

interface ChipProps {
  tone?: ChipTone;
  solid?: boolean;
  children: string;
}

export function Chip({ tone = 'ink', solid, children }: ChipProps) {
  const { tidewater, typography, spacing } = useTheme();
  const palette: Record<ChipTone, { stroke: string; fill: string }> = {
    ink: { stroke: tidewater.ink, fill: tidewater.paper },
    green: { stroke: tidewater.green, fill: tidewater.greenSoft },
    yellow: { stroke: tidewater.yellowDeep, fill: tidewater.yellowSoft },
    red: { stroke: tidewater.red, fill: tidewater.redSoft },
    mute: { stroke: tidewater.ink3, fill: tidewater.paper2 },
  };
  const { stroke, fill } = palette[tone];
  const backgroundColor = solid ? stroke : fill;
  const foreground = solid ? tidewater.paper : stroke;

  return (
    <View
      style={{
        borderWidth: 1.5,
        borderColor: stroke,
        backgroundColor,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          ...typography.monoSm,
          fontFamily: 'IBMPlexMono_600SemiBold',
          fontWeight: '600',
          color: foreground,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
