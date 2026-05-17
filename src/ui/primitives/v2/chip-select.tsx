import React from 'react';
import { Pressable, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';

export interface ChipOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

export interface ChipSelectProps<T extends string = string> {
  value: T | null;
  options: Array<ChipOption<T> | T>;
  onChange: (value: T) => void;
  scrollable?: boolean;
  style?: ViewStyle;
}

function normalize<T extends string>(o: ChipOption<T> | T): ChipOption<T> {
  return typeof o === 'string' ? { value: o, label: o } : o;
}

export function ChipSelect<T extends string = string>({
  value,
  options,
  onChange,
  style,
}: ChipSelectProps<T>) {
  const { tokens } = useTheme();

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
        const active = o.value === value;

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

        const countStyle: TextStyle = {
          fontFamily: 'JetBrainsMono_500Medium',
          fontWeight: '500',
          fontSize: 11,
          lineHeight: 14,
          color: active ? tokens.accentInk : tokens.textDim,
          opacity: 0.85,
        };

        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={({ pressed }) => [
              itemStyle,
              pressed ? { transform: [{ scale: 0.97 }] } : null,
            ]}
          >
            <Text selectable={false} style={labelStyle}>
              {o.label}
            </Text>
            {typeof o.count === 'number' ? (
              <Text selectable={false} style={countStyle}>
                {o.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
