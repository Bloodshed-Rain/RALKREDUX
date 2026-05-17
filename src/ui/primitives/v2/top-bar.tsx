import React from 'react';
import { View, Text, type ViewStyle, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';

export interface TopBarProps {
  title: string;
  subtitle?: string;
  large?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  style?: ViewStyle;
}

export function TopBar({ title, subtitle, large, leading, trailing, style }: TopBarProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    paddingTop: Math.max(insets.top, 12),
    paddingHorizontal: 20,
    paddingBottom: large ? 4 : 8,
    backgroundColor: tokens.bg,
    ...style,
  };

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 36,
  };

  const compactTitleStyle: TextStyle = {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.34,
    color: tokens.text,
    flex: 1,
    textAlign: 'center',
  };

  const heroTitleStyle: TextStyle = {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1.12,
    color: tokens.text,
  };

  const heroSubStyle: TextStyle = {
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 18,
    color: tokens.textDim,
    marginTop: 4,
  };

  return (
    <View style={containerStyle}>
      <View style={rowStyle}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {leading ?? null}
        </View>
        {!large ? (
          <Text style={compactTitleStyle} numberOfLines={1}>
            {title}
          </Text>
        ) : (
          <View />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {trailing ?? null}
        </View>
      </View>
      {large ? (
        <View style={{ paddingTop: 6, paddingBottom: 16 }}>
          <Text style={heroTitleStyle}>{title}</Text>
          {subtitle ? <Text style={heroSubStyle}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
