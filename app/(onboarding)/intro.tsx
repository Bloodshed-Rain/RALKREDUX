import React from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { useReducedMotion } from '@/src/ui/animation/use-reduced-motion';
import { type } from '@/src/ui/theme/type';
import { Button } from '@/src/ui/primitives/v2';
import {
  IconBrand,
  IconChain,
  IconChevron,
  IconOffline,
  type IconProps,
} from '@/src/ui/icons';
import { PrefKeys, writePref } from '@/src/storage/local-prefs';
import { haptics } from '@/src/ui/haptics';

interface Slide {
  icon: React.ComponentType<IconProps>;
  title: string;
  sub: string;
  cta: string;
}

const SLIDES: Slide[] = [
  {
    icon: IconBrand,
    title: 'Your logbook,\nin your pocket.',
    sub: 'RALB is an offline-first rope-access logbook for SPRAT and IRATA technicians. Log hours, capture signatures, prove your record.',
    cta: 'Continue',
  },
  {
    icon: IconChain,
    title: 'Tamper-evident\nby design.',
    sub: 'Every signed entry hashes into the chain. Auditors verify your record without trusting us — they trust the chain.',
    cta: 'Continue',
  },
  {
    icon: IconOffline,
    title: 'Works off-rope,\nworks off-grid.',
    sub: 'Write entries from the truck, the tower top, or the trailer. Records flush automatically when you reconnect.',
    cta: 'Get started',
  },
];

export default function OnboardingIntroScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [step, setStep] = React.useState(0);

  const heroScale = React.useRef(new Animated.Value(reduced ? 1 : 0.6)).current;
  const heroOpacity = React.useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const textY = React.useRef(new Animated.Value(reduced ? 0 : 8)).current;
  const textOpacity = React.useRef(new Animated.Value(reduced ? 1 : 0)).current;

  React.useEffect(() => {
    if (reduced) {
      heroScale.setValue(1);
      heroOpacity.setValue(1);
      textY.setValue(0);
      textOpacity.setValue(1);
      return;
    }
    heroScale.setValue(0.6);
    heroOpacity.setValue(0);
    textY.setValue(8);
    textOpacity.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(heroScale, {
          toValue: 1.05,
          duration: 360,
          easing: Easing.bezier(0.2, 0.7, 0.3, 1.4),
          useNativeDriver: true,
        }),
        Animated.timing(heroScale, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.bezier(0.2, 0.7, 0.3, 1.4),
        useNativeDriver: true,
      }),
      Animated.timing(textY, {
        toValue: 0,
        delay: 80,
        duration: 480,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        delay: 80,
        duration: 480,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [step, reduced, heroScale, heroOpacity, textY, textOpacity]);

  async function finish() {
    haptics.selection();
    await writePref(PrefKeys.onboardingSeen, true);
    router.replace('/setup');
  }

  function advance() {
    if (step < SLIDES.length - 1) {
      haptics.selection();
      setStep(step + 1);
    } else {
      void finish();
    }
  }

  const slide = SLIDES[step];
  const HeroIcon = slide.icon;

  const screenStyle: ViewStyle = {
    flex: 1,
    backgroundColor: tokens.bg,
    paddingTop: insets.top + 18,
    paddingBottom: insets.bottom + 18,
    paddingHorizontal: 24,
  };

  const headerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const stepKickerStyle: TextStyle = {
    ...type.monoKicker,
    color: tokens.textDim,
    letterSpacing: 2,
  };

  const skipStyle: TextStyle = {
    fontFamily: 'Manrope_600SemiBold',
    fontWeight: '600',
    fontSize: 13,
    color: tokens.text,
    padding: 8,
    marginRight: -8,
  };

  const titleStyle: TextStyle = {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 32,
    letterSpacing: -1.1,
    lineHeight: 34,
    color: tokens.text,
  };

  const subStyle: TextStyle = {
    fontSize: 15,
    lineHeight: 22,
    color: tokens.text,
    marginTop: 14,
  };

  return (
    <View style={screenStyle}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <View style={headerStyle}>
        <Text style={stepKickerStyle}>
          {String(step + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          onPress={finish}
          hitSlop={24}
        >
          <Text style={skipStyle}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 32 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            backgroundColor: tokens.accent,
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'flex-start',
            transform: [{ scale: heroScale }],
            opacity: heroOpacity,
          }}
        >
          <HeroIcon size={57} color={tokens.accentInk} fill={tokens.accentInk} fillOpacity={0.28} />
        </Animated.View>
        <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textY }] }}>
          <Text style={titleStyle}>{slide.title}</Text>
          <Text style={subStyle}>{slide.sub}</Text>
        </Animated.View>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === step ? 24 : 6,
              height: 6,
              borderRadius: 999,
              backgroundColor: i === step ? tokens.accent : tokens.surface2,
            }}
          />
        ))}
      </View>

      <Button variant="primary" size="lg" full iconRight={IconChevron} onPress={advance}>
        {slide.cta}
      </Button>
    </View>
  );
}
