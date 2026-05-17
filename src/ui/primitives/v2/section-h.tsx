import React from 'react';
import { View, Text, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';

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

  const kickerStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontWeight: '600',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.5,
    color: tokens.textFaint,
    textTransform: 'uppercase',
  };

  const titleStyle: TextStyle = {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.22,
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
