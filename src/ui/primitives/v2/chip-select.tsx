import React from 'react';
import { Pressable, ScrollView, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import type { IconProps } from '@/src/ui/icons';

export interface ChipOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  icon?: React.ComponentType<IconProps>;
}

export interface ChipSelectProps<T extends string = string> {
  value: T | null;
  options: Array<ChipOption<T> | T>;
  onChange: (value: T) => void;
  // Lay the chips out on ONE horizontally-scrolling line instead of wrapping.
  // Use for long filter bars (Records, Gear): wrapping there costs a second row
  // and, because the row's height tracks the chip counts, makes the list below
  // jump as those counts gain or lose a digit. Short in-form selects (scheme,
  // level, on/off) stay wrapped — they fit, and a scroll view inside a form
  // competes with the page scroll for the gesture.
  scroll?: boolean;
  style?: ViewStyle;
}

function normalize<T extends string>(o: ChipOption<T> | T): ChipOption<T> {
  return typeof o === 'string' ? { value: o, label: o } : o;
}

export function ChipSelect<T extends string = string>({
  value,
  options,
  onChange,
  scroll,
  style,
}: ChipSelectProps<T>) {
  const { tokens } = useTheme();

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    flexWrap: scroll ? 'nowrap' : 'wrap',
    gap: 6,
    ...style,
  };

  const chips = (
    <View style={containerStyle}>
      {options.map((raw) => {
        const o = normalize(raw);
        const active = o.value === value;
        const Icon = o.icon;

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
            // Chips are ~30px tall; hitSlop lifts the effective touch target to
            // the 44px the rest of the app (IconBtn) codifies — for gloved use.
            hitSlop={7}
            style={({ pressed }) => [
              itemStyle,
              pressed ? { transform: [{ scale: 0.97 }] } : null,
            ]}
          >
            {Icon ? (
              <Icon
                size={14}
                color={active ? tokens.accentInk : tokens.textDim}
                fill={active ? tokens.accentInk : tokens.textDim}
              />
            ) : null}
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

  if (!scroll) return chips;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {chips}
    </ScrollView>
  );
}
