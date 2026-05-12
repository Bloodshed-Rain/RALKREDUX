import React from 'react';
import { Animated, Dimensions, Easing, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '../animation/use-reduced-motion';
import { useTheme } from '../theme/theme-provider';

interface SplashScreenProps {
  label?: string;
  /** Set true to hold the progress bar full instead of animating. */
  ready?: boolean;
}

/**
 * M.4 Splash — ink plate with a yellow shine sweep + indeterminate progress bar.
 * 4s shine loop · 3.2s progress loop, per the brand handoff.
 */
export function SplashScreen({ label = 'PREPARING LOGBOOK', ready = false }: SplashScreenProps) {
  const { tidewater, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const screenWidth = Dimensions.get('window').width;

  const shineX = React.useRef(new Animated.Value(0)).current;
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (reduced) {
      shineX.setValue(0.5);
      progress.setValue(ready ? 1 : 0.65);
      return;
    }
    const shineLoop = Animated.loop(
      Animated.timing(shineX, {
        toValue: 1,
        duration: 4000,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
        useNativeDriver: true,
      }),
    );
    shineLoop.start();
    let progressLoop: Animated.CompositeAnimation;
    if (ready) {
      progressLoop = Animated.timing(progress, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
    } else {
      progressLoop = Animated.loop(
        Animated.timing(progress, {
          toValue: 1,
          duration: 3200,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      );
    }
    progressLoop.start();
    return () => {
      shineLoop.stop();
      progressLoop.stop();
    };
  }, [progress, ready, reduced, shineX]);

  const shineWidth = screenWidth * 0.45;
  const shineTranslate = shineX.interpolate({
    inputRange: [0, 1],
    outputRange: [-shineWidth, screenWidth + shineWidth],
  });
  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={{ flex: 1, backgroundColor: tidewater.ink, overflow: 'hidden' }}>
      {/* Ambient warm wash anchored at the bottom of the plate */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '70%',
          backgroundColor: 'rgba(245,197,24,0.06)',
        }}
      />

      {/* Hot yellow shine sweep — translates across the screen at a skew */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -160,
          bottom: -160,
          width: shineWidth,
          backgroundColor: 'rgba(245,197,24,0.18)',
          transform: [{ translateX: shineTranslate }, { skewX: '-18deg' }],
        }}
      />

      {/* Inner hot streak — narrower and brighter, slightly faster perceived shine */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -160,
          bottom: -160,
          width: shineWidth * 0.18,
          marginLeft: shineWidth * 0.4,
          backgroundColor: 'rgba(255,255,255,0.10)',
          transform: [{ translateX: shineTranslate }, { skewX: '-18deg' }],
        }}
      />

      {/* Centered monogram */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            borderWidth: 2,
            borderColor: tidewater.paper,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.sm,
          }}
        >
          <Text
            style={{
              fontFamily: 'Archivo_900Black',
              fontSize: 56,
              lineHeight: 60,
              color: tidewater.paper,
              fontWeight: '900',
              letterSpacing: 6,
            }}
          >
            RALB
          </Text>
        </View>
        <Text
          style={{
            ...typography.monoSm,
            color: 'rgba(230,236,232,0.72)',
            letterSpacing: 3,
            marginTop: spacing.xs,
          }}
        >
          ROPE ACCESS LOGBOOK
        </Text>
        <Text
          style={{
            ...typography.monoSm,
            color: 'rgba(230,236,232,0.42)',
            letterSpacing: 2,
          }}
        >
          FORM 27-A · EST. ANNO IV
        </Text>
      </View>

      {/* Bottom: status + progress bar */}
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.lg + insets.bottom,
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              ...typography.monoSm,
              color: 'rgba(230,236,232,0.62)',
              letterSpacing: 1.8,
            }}
            numberOfLines={1}
          >
            {label.toUpperCase()}
          </Text>
          <Text
            style={{
              ...typography.monoSm,
              color: 'rgba(230,236,232,0.42)',
              letterSpacing: 1.8,
            }}
          >
            v2
          </Text>
        </View>
        <View
          style={{
            height: 2,
            backgroundColor: 'rgba(230,236,232,0.18)',
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={{
              height: '100%',
              width: progressWidth,
              backgroundColor: tidewater.accent,
            }}
          />
        </View>
      </View>
    </View>
  );
}
