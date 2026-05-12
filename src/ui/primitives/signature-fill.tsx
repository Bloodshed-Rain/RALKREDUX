import React from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useReducedMotion } from '../animation/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';

interface SignatureFillProps {
  /** The italic name to write onto the line. */
  name: string;
  /** Override the baseline color. Defaults to tidewater.ink. */
  baselineColor?: string;
  /** Override the italic ink color. Defaults to tidewater.ink. */
  inkColor?: string;
  /** Italic font size. Defaults to 22. */
  fontSize?: number;
  /** Total height including baseline + descender room. */
  height?: number;
  /** Animation duration in ms. Default 2400. */
  duration?: number;
}

/**
 * M.8 Signature fill — italic name appears on a baseline by progressively
 * unmasking a clipped view from left to right. 2.4s ease-out per the
 * handoff spec.
 */
export function SignatureFill({
  name,
  baselineColor,
  inkColor,
  fontSize = 22,
  height,
  duration = 2400,
}: SignatureFillProps) {
  const { tidewater } = useTheme();
  const reduced = useReducedMotion();
  const totalHeight = height ?? Math.round(fontSize * 1.5);
  const progress = React.useRef(new Animated.Value(reduced ? 1 : 0)).current;

  React.useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      // Width animation requires layout, native driver not supported here.
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
    };
  }, [duration, name, progress, reduced]);

  const widthInterp = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={{
        height: totalHeight,
        justifyContent: 'flex-end',
        borderBottomWidth: 1.5,
        borderBottomColor: baselineColor ?? tidewater.ink,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          width: widthInterp,
          overflow: 'hidden',
          alignSelf: 'flex-start',
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontFamily: 'Newsreader_500Medium_Italic',
            fontStyle: 'italic',
            fontSize,
            lineHeight: Math.round(fontSize * 1.1),
            color: inkColor ?? tidewater.ink,
          }}
        >
          {name}
        </Text>
      </Animated.View>
    </View>
  );
}
