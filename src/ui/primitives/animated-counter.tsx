import React from 'react';
import { Animated, Easing, Text, TextStyle, View } from 'react-native';
import { useReducedMotion } from '../animation/use-reduced-motion';

interface AnimatedCounterProps {
  /** The fully formatted text to display (e.g. "12.4", "07", "1,247"). Only ASCII digits are animated; other characters render static. */
  text: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: TextStyle['fontWeight'];
  color?: string;
  letterSpacing?: number;
  /** Visible height of each digit slot. Should match the font's line height. Defaults to fontSize * 1.15. */
  height?: number;
  /** Visible width of each digit slot. Defaults to fontSize * 0.7. */
  width?: number;
  /** Per-digit roll duration. Default 1800ms. */
  duration?: number;
  /** Stagger between adjacent digit starts. Default 120ms. */
  stagger?: number;
  /**
   * Optional cache key. When provided, the counter only rolls when its value
   * has changed since the last time this key was rendered. Same value →
   * settle directly (no roll-from-0 on screen focus). New value → roll.
   */
  cacheKey?: string;
}

const ROLL_EASING = Easing.bezier(0.5, 0.1, 0.5, 1);

/**
 * Module-level cache of last-seen text per cacheKey. Lives for the app
 * session. Used so navigating back to a screen with stable numeric values
 * doesn't roll the digits from zero on every focus.
 */
const lastSeenByCacheKey = new Map<string, string>();

/**
 * M.3 Ledger counter — rolling slot digits.
 * Each digit (0–9) animates from 0 up to its target over `duration` ms with
 * `stagger` ms delay between adjacent positions. Non-digit characters render
 * static so callers can pass formatted strings like "12.4" or "1,247".
 */
export function AnimatedCounter({
  text,
  fontFamily,
  fontSize = 16,
  fontWeight,
  color = '#000',
  letterSpacing,
  height,
  width,
  duration = 1800,
  stagger = 120,
  cacheKey,
}: AnimatedCounterProps) {
  const slotHeight = height ?? Math.round(fontSize * 1.15);
  const slotWidth = width ?? Math.round(fontSize * 0.7);
  const reduced = useReducedMotion();

  // If a cacheKey is supplied and we've seen this exact text under that key
  // already this session, render the digits settled. Update the cache as soon
  // as we commit to rolling so a re-mount mid-animation still settles.
  const skipRollOnMount = React.useRef(
    Boolean(cacheKey) && lastSeenByCacheKey.get(cacheKey!) === text,
  ).current;

  React.useEffect(() => {
    if (cacheKey) lastSeenByCacheKey.set(cacheKey, text);
  }, [cacheKey, text]);

  const chars = React.useMemo(() => text.split(''), [text]);
  const digitIndices = React.useMemo(
    () => chars.map((c, i) => (/^\d$/.test(c) ? i : -1)).filter((i) => i >= 0),
    [chars],
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {chars.map((char, i) => {
        if (/^\d$/.test(char)) {
          const positionInDigits = digitIndices.indexOf(i);
          return (
            <DigitSlot
              key={`${i}-${char}`}
              digit={Number(char)}
              delay={positionInDigits * stagger}
              duration={duration}
              height={slotHeight}
              width={slotWidth}
              fontFamily={fontFamily}
              fontSize={fontSize}
              fontWeight={fontWeight}
              color={color}
              letterSpacing={letterSpacing}
              reduced={reduced}
              skipInitialRoll={skipRollOnMount}
            />
          );
        }
        return (
          <Text
            key={`${i}-${char}`}
            style={{
              height: slotHeight,
              lineHeight: slotHeight,
              fontFamily,
              fontSize,
              fontWeight,
              color,
              letterSpacing,
              textAlign: 'center',
            }}
          >
            {char}
          </Text>
        );
      })}
    </View>
  );
}

interface DigitSlotProps {
  digit: number;
  delay: number;
  duration: number;
  height: number;
  width: number;
  fontFamily?: string;
  fontSize: number;
  fontWeight?: TextStyle['fontWeight'];
  color: string;
  letterSpacing?: number;
  reduced: boolean;
  /** When true, the very first mount settles directly; subsequent digit changes still roll. */
  skipInitialRoll: boolean;
}

function DigitSlot({
  digit,
  delay,
  duration,
  height,
  width,
  fontFamily,
  fontSize,
  fontWeight,
  color,
  letterSpacing,
  reduced,
  skipInitialRoll,
}: DigitSlotProps) {
  const isFirstRunRef = React.useRef(true);
  const settledOnMount = reduced || skipInitialRoll;
  const offset = React.useRef(new Animated.Value(settledOnMount ? digit : 0)).current;

  React.useEffect(() => {
    if (reduced) {
      offset.setValue(digit);
      return;
    }
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      if (skipInitialRoll) {
        offset.setValue(digit);
        return;
      }
    }
    offset.setValue(0);
    const animation = Animated.timing(offset, {
      toValue: digit,
      duration,
      easing: ROLL_EASING,
      delay,
      useNativeDriver: true,
    });
    animation.start();
    return () => {
      animation.stop();
    };
  }, [delay, digit, duration, offset, reduced, skipInitialRoll]);

  const translateY = offset.interpolate({
    inputRange: [0, 9],
    outputRange: [0, -height * 9],
  });

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {Array.from({ length: 10 }).map((_, n) => (
          <Text
            key={n}
            style={{
              width,
              height,
              lineHeight: height,
              fontFamily,
              fontSize,
              fontWeight,
              color,
              letterSpacing,
              textAlign: 'center',
            }}
          >
            {n}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}
