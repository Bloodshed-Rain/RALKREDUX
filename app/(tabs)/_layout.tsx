import React from 'react';
import { router, Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Animated, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import type { ThemeTokens } from '@/src/ui/theme/themes';
import { isHeliotypeFamily } from '@/src/ui/theme/themes';
import { haptics } from '@/src/ui/haptics';
import { useReducedMotion } from '@/src/ui/animation/use-reduced-motion';
import { AnimatedPressable, usePressScale } from '@/src/ui/animation/use-press-scale';
import { press as pressTokens, easings, durations } from '@/src/ui/animation/motion';
import {
  IconGear,
  IconPlus,
  IconProfile,
  IconRecords,
  IconToday,
  type IconProps,
} from '@/src/ui/icons';

type TabIcon = React.ComponentType<IconProps>;

const TAB_ICONS: Record<string, TabIcon> = {
  today: IconToday,
  records: IconRecords,
  gear: IconGear,
  more: IconProfile,
};

// A single tab cell. Owns two independent animations: the press scale (shared
// usePressScale) on the whole cell, and a `focus` value that lifts the icon a
// hair and grows an accent underline in when this tab becomes active. The
// underline space is reserved on every tab so switching tabs cross-fades the
// indicator into place rather than nudging the layout.
function TabButton({
  Icon,
  label,
  isFocused,
  tokens,
  onPress,
  onLongPress,
  accessibilityLabel,
  testID,
}: {
  Icon: TabIcon | undefined;
  label: string;
  isFocused: boolean;
  tokens: ThemeTokens;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const reduced = useReducedMotion();
  const pressScale = usePressScale(pressTokens.scale.tab);
  const focus = React.useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  React.useEffect(() => {
    if (reduced) {
      focus.setValue(isFocused ? 1 : 0);
      return;
    }
    const anim = Animated.timing(focus, {
      // Short settle on the house ease-out — same motion family, no lag per tap.
      toValue: isFocused ? 1 : 0,
      duration: durations.tabFocus,
      easing: easings.standard,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [isFocused, reduced, focus]);

  const color = isFocused ? tokens.text : tokens.textDim;
  const fill = isFocused ? tokens.accent : tokens.textFaint;

  const labelStyle: TextStyle = {
    fontFamily: 'Manrope_600SemiBold',
    fontWeight: '600',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.2,
    color,
    marginTop: 3,
  };

  // Omit `transform` entirely under reduced motion — never `transform: undefined`
  // (it can serialize to null and trip Fabric's _validateTransforms).
  const columnStyle = reduced
    ? { alignItems: 'center' as const }
    : {
        alignItems: 'center' as const,
        transform: [{ translateY: focus.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
      };

  const indicatorStyle = reduced
    ? {
        marginTop: 4,
        width: 18,
        height: 2.5,
        borderRadius: 2,
        backgroundColor: tokens.accent,
        opacity: isFocused ? 1 : 0,
      }
    : {
        marginTop: 4,
        width: 18,
        height: 2.5,
        borderRadius: 2,
        backgroundColor: tokens.accent,
        opacity: focus,
        transform: [{ scaleX: focus.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
      };

  return (
    <AnimatedPressable
      accessibilityRole="tab"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressScale.onPressIn}
      onPressOut={pressScale.onPressOut}
      style={[
        { flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 12 },
        pressScale.style,
      ]}
    >
      <Animated.View style={columnStyle}>
        {Icon ? <Icon size={26} color={color} fill={fill} /> : null}
        <Text selectable={false} numberOfLines={1} style={labelStyle}>
          {label}
        </Text>
      </Animated.View>
      <Animated.View pointerEvents="none" style={indicatorStyle} />
    </AnimatedPressable>
  );
}

// The center "+" action. Press scale + a slight counter-clockwise tip, driven
// off one gesture value so they move together.
function FabButton({
  tokens,
  isHeliotype,
  onPress,
}: {
  tokens: ThemeTokens;
  isHeliotype: boolean;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const pressScale = usePressScale();

  const fabStyle = reduced
    ? null
    : {
        transform: [
          {
            scale: pressScale.value.interpolate({
              inputRange: [0, 1],
              outputRange: [1, pressTokens.scale.fab],
            }),
          },
          {
            rotate: pressScale.value.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '-8deg'],
            }),
          },
        ],
      };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Create new entry"
      onPress={onPress}
      onPressIn={pressScale.onPressIn}
      onPressOut={pressScale.onPressOut}
      style={[{ width: 84, alignItems: 'center', justifyContent: 'flex-end' }, fabStyle]}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tokens.accent,
          shadowColor: isHeliotype ? tokens.line : tokens.accent,
          shadowOffset: { width: 0, height: isHeliotype ? 3 : 12 },
          shadowOpacity: isHeliotype ? 1 : 0.45,
          shadowRadius: isHeliotype ? 0 : 18,
          elevation: 8,
          borderWidth: isHeliotype ? 2 : 0,
          borderColor: isHeliotype ? tokens.line : 'transparent',
        }}
      >
        <IconPlus size={31} color={tokens.accentInk} fill={tokens.accentInk} fillOpacity={0.2} />
      </View>
    </AnimatedPressable>
  );
}

function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme, tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const isHeliotype = isHeliotypeFamily(theme.key);
  const bottomPad = Math.max(insets.bottom, 12) + 8;

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: bottomPad,
    backgroundColor: tokens.bg,
    borderTopWidth: 1,
    borderTopColor: tokens.lineSoft,
  };

  return (
    <View role="tablist" style={containerStyle}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        if (route.name === 'new') {
          return (
            <FabButton
              key={route.key}
              tokens={tokens}
              isHeliotype={isHeliotype}
              onPress={() => {
                haptics.selection();
                router.push('/entry/new');
              }}
            />
          );
        }

        const Icon = TAB_ICONS[route.name];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            haptics.selection();
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <TabButton
            key={route.key}
            Icon={Icon}
            label={typeof label === 'string' ? label : route.name}
            isFocused={isFocused}
            tokens={tokens}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
          />
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="records" options={{ title: 'Records' }} />
      <Tabs.Screen name="new" options={{ title: 'New' }} />
      <Tabs.Screen name="gear" options={{ title: 'Gear' }} />
      <Tabs.Screen name="more" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
