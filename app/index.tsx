import React from 'react';
import { Animated, Easing, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { Redirect } from 'expo-router';
import { useProfile } from '@/src/domain/profile/use-profile';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { useReducedMotion } from '@/src/ui/animation/use-reduced-motion';
import { type } from '@/src/ui/theme/type';
import { IconBrand } from '@/src/ui/icons';
import { PrefKeys, readPref } from '@/src/storage/local-prefs';

const SPLASH_MIN_MS = 1800;
const BAR_WIDTH = 140;
const BAR_HEIGHT = 3;
const SWEEP_WIDTH = 56;

export default function IndexRoute() {
  const profile = useProfile();
  const { tokens } = useTheme();
  const reduced = useReducedMotion();

  const [minElapsed, setMinElapsed] = React.useState(false);
  const [onboardingSeen, setOnboardingSeen] = React.useState<boolean | null>(null);
  const sweep = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    readPref<boolean>(PrefKeys.onboardingSeen, false).then((seen) => {
      if (!cancelled) setOnboardingSeen(seen);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep, reduced]);

  const ready = minElapsed && !profile.isLoading && onboardingSeen !== null;
  if (ready) {
    if (profile.data) return <Redirect href="/today" />;
    if (onboardingSeen) return <Redirect href="/setup" />;
    return <Redirect href="/intro" />;
  }

  const screenStyle: ViewStyle = {
    flex: 1,
    backgroundColor: tokens.bg,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const wordmarkStyle: TextStyle = {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 22,
    letterSpacing: -0.66,
    color: tokens.text,
  };

  const captionStyle: TextStyle = {
    ...type.monoSm,
    color: tokens.textDim,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    marginTop: 4,
  };

  const sweepX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-SWEEP_WIDTH, BAR_WIDTH],
  });

  return (
    <View style={screenStyle}>
      <View style={{ alignItems: 'center', gap: 18 }}>
        <IconBrand size={80} color={tokens.text} fill={tokens.accent} />
        <View style={{ alignItems: 'center' }}>
          <Text style={wordmarkStyle}>RALB</Text>
          <Text style={captionStyle}>Rope Access Logbook</Text>
        </View>
        <View
          style={{
            width: BAR_WIDTH,
            height: BAR_HEIGHT,
            borderRadius: BAR_HEIGHT / 2,
            backgroundColor: tokens.surface2,
            marginTop: 28,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={{
              width: SWEEP_WIDTH,
              height: BAR_HEIGHT,
              borderRadius: BAR_HEIGHT / 2,
              backgroundColor: tokens.accent,
              transform: [{ translateX: sweepX }],
            }}
          />
        </View>
      </View>
    </View>
  );
}
