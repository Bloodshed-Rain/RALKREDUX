import React from 'react';
import { View, Text, type ViewStyle, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';

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

  // Spread the scaled type tokens so titles track UI_SCALE instead of rendering
  // ~16% smaller than the surrounding chrome (the typography-drift class).
  const heroTitleStyle: TextStyle = {
    ...type.screenTitle,
    color: tokens.text,
  };

  const heroSubStyle: TextStyle = {
    ...type.cardSub,
    color: tokens.textDim,
    marginTop: 4,
  };

  const compactSubStyle: TextStyle = {
    ...type.cardSub,
    color: tokens.textDim,
    textAlign: 'center',
    marginTop: 2,
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
      ) : subtitle ? (
        // Compact mode previously dropped the subtitle entirely — on screens
        // like Attachments it carried the only file-count / loading text.
        <Text style={compactSubStyle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
