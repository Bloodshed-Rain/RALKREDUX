import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/theme-provider';

interface FormCellProps {
  n?: string;
  label: string;
  value?: string | React.ReactNode;
  mono?: boolean;
  empty?: boolean;
  danger?: boolean;
  fill?: string;
}

export function FormCell({ n, label, value, mono = true, empty, danger, fill }: FormCellProps) {
  const { hairlines, typography, spacing, tidewater } = useTheme();
  const isStringValue = typeof value === 'string' || value === undefined;
  const isEmpty = empty || (typeof value === 'string' && value.trim().length === 0);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.xs + 2,
        borderBottomWidth: hairlines.faint.width,
        borderBottomColor: hairlines.faint.color,
      }}
    >
      {n ? (
        <Text style={{ ...typography.monoSm, color: tidewater.ink3, width: 24 }}>{n}</Text>
      ) : null}
      <Text
        style={{
          ...typography.caption,
          color: tidewater.ink3,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          width: 96,
        }}
      >
        {label}
      </Text>
      {isStringValue ? (
        <Text
          style={{
            ...(mono ? typography.monoMd : typography.body),
            color: isEmpty || danger ? tidewater.red : tidewater.ink,
            fontStyle: isEmpty ? 'italic' : 'normal',
            flex: 1,
            backgroundColor: fill ?? 'transparent',
            paddingHorizontal: fill ? spacing.xs : 0,
            paddingVertical: fill ? 2 : 0,
          }}
        >
          {(value as string) ?? (isEmpty ? '— missing —' : '')}
        </Text>
      ) : (
        <View style={{ flex: 1 }}>{value}</View>
      )}
    </View>
  );
}
