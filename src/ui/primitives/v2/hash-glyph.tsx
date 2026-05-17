import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';

export interface HashGlyphProps {
  hash?: string | null;
  size?: number;
  gap?: number;
  style?: ViewStyle;
}

// 8-bar deterministic visualization keyed by the first 8 hex chars of a hash.
// Each bar's height + opacity derives from the char value (0–15).
// Bars at index 0, 3, 6 paint with the accent color; the rest use textDim.
export function HashGlyph({ hash, size = 22, gap = 2, style }: HashGlyphProps) {
  const { tokens } = useTheme();
  const chars = (hash ?? '00000000').slice(0, 8).padEnd(8, '0');
  const values = Array.from(chars, (c) => {
    const n = parseInt(c, 16);
    return Number.isNaN(n) ? 0 : n;
  });
  const barWidth = (size - gap * 7) / 8;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-end',
          height: size,
          width: size,
          gap,
        },
        style,
      ]}
    >
      {values.map((v, i) => {
        const heightPct = 0.2 + (v / 15) * 0.8;
        const opacity = 0.4 + (v / 15) * 0.6;
        const color = i % 3 === 0 ? tokens.accent : tokens.textDim;
        return (
          <View
            key={i}
            style={{
              width: barWidth,
              height: size * heightPct,
              backgroundColor: color,
              opacity,
              borderRadius: 1,
            }}
          />
        );
      })}
    </View>
  );
}
