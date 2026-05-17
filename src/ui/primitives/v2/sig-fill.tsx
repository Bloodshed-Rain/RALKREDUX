import React from 'react';
import { Animated, Easing, View, Text, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { useReducedMotion } from '@/src/ui/animation/use-reduced-motion';

export interface SigFillProps {
  name: string;
  height?: number;
  // Width the signature scrawl animates to; defaults to a generous 240 px.
  scrawlWidth?: number;
}

// Signature-line animation: a baseline hairline + a Newsreader-italic name
// that "writes onto the line" from left to right over 2.2 s on mount. Clips
// the text via an animated max-width wrapper. Respects reduced motion: when
// enabled, the full name is shown instantly with no animation.
export function SigFill({ name, height = 64, scrawlWidth = 240 }: SigFillProps) {
  const { tokens } = useTheme();
  const reduced = useReducedMotion();
  const width = React.useRef(new Animated.Value(reduced ? scrawlWidth : 0)).current;

  React.useEffect(() => {
    if (reduced) {
      width.setValue(scrawlWidth);
      return;
    }
    width.setValue(0);
    Animated.timing(width, {
      toValue: scrawlWidth,
      duration: 2200,
      easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [name, reduced, scrawlWidth, width]);

  const containerStyle: ViewStyle = {
    height,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    paddingLeft: 4,
  };

  const baselineStyle: ViewStyle = {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 12,
    height: 1,
    backgroundColor: tokens.line,
  };

  const textStyle: TextStyle = {
    fontFamily: 'Newsreader_600SemiBold_Italic',
    fontWeight: '600',
    fontStyle: 'italic',
    fontSize: 26,
    lineHeight: 30,
    color: tokens.text,
    letterSpacing: 0.4,
  };

  return (
    <View style={containerStyle}>
      <View style={baselineStyle} />
      <Animated.View style={{ width, overflow: 'hidden' }}>
        <Text numberOfLines={1} style={textStyle}>
          {name}
        </Text>
      </Animated.View>
    </View>
  );
}
