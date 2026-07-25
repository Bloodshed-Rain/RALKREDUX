import React from 'react';
import { View, Text, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { scaled, scaledF } from '@/src/ui/scale';

export interface SectionHProps {
  title: string;
  kicker?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export function SectionH({ title, kicker, action, style }: SectionHProps) {
  const { tokens } = useTheme();

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 8,
    ...style,
  };

  // Spread the scaled type token so section headers track UI_SCALE instead of
  // rendering ~18% smaller than the TopBar title above them and the card titles
  // below them (the typography-drift class — but in a primitive, so this one
  // file fixes every screen at once).
  const kickerStyle: TextStyle = {
    ...type.monoKicker,
    color: tokens.textFaint,
    textTransform: 'uppercase',
  };

  // No token sits at 15/20, so scale explicitly to stay in proportion — this
  // title reads between `cardTitle` (14) and `sectionTitle` (18).
  const titleStyle: TextStyle = {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
    fontSize: scaled(15),
    lineHeight: scaled(20),
    letterSpacing: scaledF(-0.22),
    color: tokens.text,
  };

  return (
    <View style={containerStyle}>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        {kicker ? <Text style={kickerStyle}>{kicker}</Text> : null}
        <Text style={titleStyle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}
