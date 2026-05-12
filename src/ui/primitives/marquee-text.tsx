import React from 'react';
import { Animated, Easing, LayoutChangeEvent, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useReducedMotion } from '../animation/use-reduced-motion';

interface MarqueeTextProps {
  text: string;
  style?: TextStyle;
  /** Container style override (gets `flex: 1, overflow: 'hidden'` baked in). */
  containerStyle?: ViewStyle;
  /** Reference loop duration for a 320px wide string. Actual duration scales with content. */
  duration?: number;
  /** Visible gap between the two looping copies. */
  gap?: number;
}

/**
 * M.9 Ticker tape — continuous status crawl. Always animates (per the brand
 * "Status crawl" semantic) by translating two text copies left across the
 * container. Falls back to static rendering only when reduced motion is on.
 */
export function MarqueeText({
  text,
  style,
  containerStyle,
  duration = 14000,
  gap = 48,
}: MarqueeTextProps) {
  const reduced = useReducedMotion();
  const [contentWidth, setContentWidth] = React.useState(0);
  const translateX = React.useRef(new Animated.Value(0)).current;

  const shouldMarquee = !reduced && contentWidth > 0 && text.length > 0;

  React.useEffect(() => {
    if (!shouldMarquee) {
      translateX.setValue(0);
      return;
    }
    const distance = contentWidth + gap;
    // Pace the loop relative to text length so short status strings don't fly past too fast.
    const pacedDuration = Math.max(duration * (distance / 320), 2200);
    translateX.setValue(0);
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: -distance,
        duration: pacedDuration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [contentWidth, duration, gap, shouldMarquee, translateX]);

  function handleContentLayout(event: LayoutChangeEvent) {
    setContentWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, containerStyle]}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX }] }}>
        <Text style={style} numberOfLines={1} onLayout={handleContentLayout}>
          {text}
        </Text>
        {shouldMarquee ? (
          <>
            <View style={{ width: gap }} />
            <Text style={style} numberOfLines={1}>
              {text}
            </Text>
            <View style={{ width: gap }} />
            <Text style={style} numberOfLines={1}>
              {text}
            </Text>
          </>
        ) : null}
      </Animated.View>
    </View>
  );
}
