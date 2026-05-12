import React from 'react';
import { Animated, Easing, LayoutChangeEvent, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useReducedMotion } from '../animation/use-reduced-motion';

interface MarqueeTextProps {
  text: string;
  style?: TextStyle;
  /** Container style override (gets `flex: 1, overflow: 'hidden'` baked in). */
  containerStyle?: ViewStyle;
  /** Loop duration when marqueeing. Default 36000ms per the brand spec. */
  duration?: number;
  /** Visible gap between the two looping copies when marqueeing. */
  gap?: number;
}

/**
 * M.9 Ticker tape — auto-scrolling status crawl that only activates when the
 * content overflows its container. Static text otherwise. 36s linear default
 * speed per the brand handoff.
 */
export function MarqueeText({
  text,
  style,
  containerStyle,
  duration = 36000,
  gap = 48,
}: MarqueeTextProps) {
  const reduced = useReducedMotion();
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [contentWidth, setContentWidth] = React.useState(0);
  const translateX = React.useRef(new Animated.Value(0)).current;

  const shouldMarquee =
    !reduced && containerWidth > 0 && contentWidth > 0 && contentWidth > containerWidth + 1;

  React.useEffect(() => {
    if (!shouldMarquee) {
      translateX.setValue(0);
      return;
    }
    const distance = contentWidth + gap;
    translateX.setValue(0);
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: -distance,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [contentWidth, duration, gap, shouldMarquee, translateX]);

  function handleContainerLayout(event: LayoutChangeEvent) {
    setContainerWidth(event.nativeEvent.layout.width);
  }

  function handleContentLayout(event: LayoutChangeEvent) {
    setContentWidth(event.nativeEvent.layout.width);
  }

  return (
    <View
      onLayout={handleContainerLayout}
      style={[{ flex: 1, overflow: 'hidden' }, containerStyle]}
    >
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX }] }}>
        <Text
          style={style}
          numberOfLines={1}
          onLayout={handleContentLayout}
        >
          {text}
        </Text>
        {shouldMarquee ? (
          <>
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
