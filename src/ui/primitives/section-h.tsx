import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/theme-provider';

interface SectionHProps {
  n?: string;
  right?: string;
  children: string;
}

export function SectionH({ n, right, children }: SectionHProps) {
  const { hairlines, tidewater, typography, spacing } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: spacing.sm,
        marginTop: spacing.md + 2,
        marginBottom: spacing.xs + 2,
        paddingBottom: spacing.xs,
        borderBottomWidth: 1.5,
        borderBottomColor: hairlines.standard.color,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
        {n ? <Text style={{ ...typography.monoSm, color: tidewater.ink3 }}>§ {n}</Text> : null}
        <Text style={{ ...typography.displaySm, color: tidewater.ink, textTransform: 'uppercase' }}>
          {children}
        </Text>
      </View>
      {right ? (
        <Text style={{ ...typography.monoSm, color: tidewater.ink3 }}>{right}</Text>
      ) : null}
    </View>
  );
}
