import React from 'react';
import { router, Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { haptics } from '@/src/ui/haptics';
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

function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme, tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const isHeliotype = theme.key === 'heliotype';
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
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel="Create new entry"
              onPress={() => {
                haptics.selection();
                router.push('/entry/new');
              }}
              style={({ pressed }) => [
                {
                  width: 84,
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                },
                pressed ? { transform: [{ scale: 0.94 }, { rotate: '-8deg' }] } : null,
              ]}
            >
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: tokens.accent,
                  shadowColor: isHeliotype ? '#1A1410' : tokens.accent,
                  shadowOffset: { width: 0, height: isHeliotype ? 3 : 12 },
                  shadowOpacity: isHeliotype ? 1 : 0.45,
                  shadowRadius: isHeliotype ? 0 : 18,
                  elevation: 8,
                  borderWidth: isHeliotype ? 2 : 0,
                  borderColor: isHeliotype ? '#1A1410' : 'transparent',
                }}
              >
                <IconPlus size={31} color={tokens.accentInk} fill={tokens.accentInk} fillOpacity={0.2} />
              </View>
            </Pressable>
          );
        }

        const Icon = TAB_ICONS[route.name];
        const color = isFocused ? tokens.text : tokens.textDim;
        const fill = isFocused ? tokens.accent : tokens.textFaint;

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

        const labelStyle: TextStyle = {
          fontFamily: 'Manrope_600SemiBold',
          fontWeight: '600',
          fontSize: 10,
          lineHeight: 12,
          letterSpacing: 0.2,
          color,
          marginTop: 3,
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ pressed }) => [
              {
                flex: 1,
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 6,
                borderRadius: 12,
              },
              pressed ? { transform: [{ scale: 0.96 }] } : null,
            ]}
          >
            {Icon ? <Icon size={26} color={color} fill={fill} /> : null}
            <Text selectable={false} numberOfLines={1} style={labelStyle}>
              {typeof label === 'string' ? label : route.name}
            </Text>
          </Pressable>
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
