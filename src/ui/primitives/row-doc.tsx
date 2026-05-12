import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/theme-provider';

export interface RowDocColumn {
  value: string | React.ReactNode;
  width?: number;
  flex?: number;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
  tone?: string;
  size?: number;
  bold?: boolean;
}

interface RowDocProps {
  cols: RowDocColumn[];
  head?: boolean;
  emphasize?: boolean;
  danger?: boolean;
}

export function RowDoc({ cols, head, emphasize, danger }: RowDocProps) {
  const { hairlines, tidewater, typography, spacing } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: head ? spacing.xs + 1 : spacing.xs + 3,
        paddingHorizontal: spacing.xs,
        borderBottomWidth: head ? 1.5 : hairlines.faint.width,
        borderBottomColor: head ? hairlines.standard.color : hairlines.faint.color,
        backgroundColor: emphasize ? tidewater.yellowSoft : 'transparent',
      }}
    >
      {cols.map((col, index) => {
        const baseStyle = col.mono ? typography.mono : typography.body;
        const color = head
          ? tidewater.ink3
          : danger
            ? tidewater.red
            : col.tone ?? tidewater.ink;
        const fontSize = col.size ?? baseStyle.fontSize;
        const fontWeight = col.bold ? '700' : baseStyle.fontWeight;
        const sizing = col.width !== undefined ? { width: col.width } : { flex: col.flex ?? 1 };
        const alignment =
          col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start';

        return (
          <View key={index} style={{ ...sizing, alignItems: alignment }}>
            {typeof col.value === 'string' ? (
              <Text
                style={{
                  ...baseStyle,
                  color,
                  fontSize,
                  fontWeight,
                  textAlign: col.align ?? 'left',
                }}
              >
                {col.value}
              </Text>
            ) : (
              col.value
            )}
          </View>
        );
      })}
    </View>
  );
}
