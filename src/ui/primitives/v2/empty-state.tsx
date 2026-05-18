import React from 'react';
import { View, Text, type ViewStyle, type TextStyle } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { IconBrand, type IconProps } from '@/src/ui/icons';

export interface EmptyStateProps {
  icon?: React.ComponentType<IconProps>;
  title: string;
  sub?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export function EmptyState({
  icon: Icon = IconBrand,
  title,
  sub,
  action,
  style,
}: EmptyStateProps) {
  const { tokens } = useTheme();

  const containerStyle: ViewStyle = {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 18,
    ...style,
  };

  const plateStyle: ViewStyle = {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: tokens.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const titleStyle: TextStyle = {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.24,
    color: tokens.text,
    textAlign: 'center',
  };

  const subStyle: TextStyle = {
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 19,
    color: tokens.textDim,
    textAlign: 'center',
    maxWidth: 260,
    marginTop: 6,
  };

  return (
    <View style={containerStyle}>
      <View style={plateStyle}>
        <Svg
          width={88}
          height={88}
          viewBox="0 0 88 88"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <Circle
            cx={44}
            cy={44}
            r={40}
            fill="none"
            stroke={tokens.lineSoft}
            strokeWidth={1}
            strokeDasharray="2 4"
          />
          <Circle cx={44} cy={44} r={30} fill="none" stroke={tokens.lineSoft} strokeWidth={1} />
        </Svg>
        <Icon size={42} color={tokens.textDim} fill={tokens.accent} />
      </View>
      <View>
        <Text style={titleStyle}>{title}</Text>
        {sub ? <Text style={subStyle}>{sub}</Text> : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}
