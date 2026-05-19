import React from 'react';
import { Pressable, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import type { ChipOption } from './chip-select';

export interface MultiChipSelectProps<T extends string = string> {
  values: readonly T[];
  options: Array<ChipOption<T> | T>;
  onChange: (next: T[]) => void;
  style?: ViewStyle;
}

function normalize<T extends string>(o: ChipOption<T> | T): ChipOption<T> {
  return typeof o === 'string' ? { value: o, label: o } : o;
}

// Multi-select chip row. Same visual treatment as `ChipSelect` (filled accent
// when active, hairline border otherwise) but the value is an array and a
// tap toggles each chip's inclusion. Used for the v3 `hazards` field on new
// entry / edit / amend, where a single work record commonly carries multiple
// concurrent hazards.
export function MultiChipSelect<T extends string = string>({
  values,
  options,
  onChange,
  style,
}: MultiChipSelectProps<T>) {
  const { tokens } = useTheme();
  const selected = new Set(values);

  function toggle(value: T) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(Array.from(next));
  }

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    ...style,
  };

  return (
    <View style={containerStyle}>
      {options.map((raw) => {
        const o = normalize(raw);
        const active = selected.has(o.value);

        const itemStyle: ViewStyle = {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 7,
          paddingHorizontal: 12,
          borderRadius: 999,
          backgroundColor: active ? tokens.accent : tokens.surface,
          borderWidth: 1,
          borderColor: active ? tokens.accent : tokens.lineSoft,
        };

        const labelStyle: TextStyle = {
          fontFamily: 'Manrope_600SemiBold',
          fontWeight: '600',
          fontSize: 12,
          lineHeight: 16,
          color: active ? tokens.accentInk : tokens.text,
        };

        return (
          <Pressable
            key={o.value}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            onPress={() => toggle(o.value)}
            hitSlop={{ top: 7, bottom: 7, left: 7, right: 7 }}
            style={({ pressed }) => [
              itemStyle,
              pressed ? { transform: [{ scale: 0.97 }] } : null,
            ]}
          >
            <Text selectable={false} style={labelStyle}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
