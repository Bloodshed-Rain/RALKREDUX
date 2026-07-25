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

  // A `large` bar with neither action slot filled (e.g. the Profile tab) used to
  // reserve the full 36pt action row anyway, opening that one screen with an
  // empty band and dropping its title lower than every other tab's. Reserve the
  // row only when something actually occupies it — compact mode always needs it,
  // since the centred title lives there.
  const hasActions = !!leading || !!trailing;
  const showActionRow = !large || hasActions;

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
      {showActionRow ? (
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
      ) : null}
      {large ? (
        <View style={{ paddingTop: showActionRow ? 6 : 0, paddingBottom: 16 }}>
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
