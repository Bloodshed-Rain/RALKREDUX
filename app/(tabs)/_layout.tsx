import { router, Tabs } from 'expo-router';
import { BookOpen, HardHat, MoreHorizontal, Plus, Sun } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, tidewater } from '@/src/ui/theme/tokens';

const RAISED_BUTTON_SIZE = 56;
const RAISED_BUTTON_LIFT = 18;

function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const tabBarHeight = 72 + bottomInset;

  return (
    <View
      role="tablist"
      style={{
        height: tabBarHeight,
        backgroundColor: colors.navBar,
        borderTopColor: colors.navBar,
        borderTopWidth: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 10,
        paddingTop: 7,
        paddingBottom: bottomInset + 7,
        overflow: 'visible',
      }}
    >
      {state.routes.map((route) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === state.routes.indexOf(route);
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
              onPress={() => router.push('/entry/new')}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'flex-start',
                overflow: 'visible',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: -RAISED_BUTTON_LIFT,
                  width: RAISED_BUTTON_SIZE,
                  height: RAISED_BUTTON_SIZE,
                  borderRadius: RAISED_BUTTON_SIZE / 2,
                  backgroundColor: colors.accentPrimary,
                  borderWidth: 2,
                  borderColor: colors.navBar,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: tidewater.ink,
                  shadowOpacity: 0.25,
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Plus color={tidewater.ink} size={28} strokeWidth={2.4} />
              </View>
              <Text
                numberOfLines={1}
                style={{
                  position: 'absolute',
                  top: RAISED_BUTTON_SIZE - RAISED_BUTTON_LIFT + 4,
                  color: colors.textInverse,
                  fontFamily: 'IBMPlexMono_500Medium',
                  fontSize: 10,
                  letterSpacing: 1.4,
                }}
              >
                NEW
              </Text>
            </Pressable>
          );
        }

        const tintColor = isFocused ? colors.navBar : colors.textInverse;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
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
            style={({ pressed }) => ({
              flex: 1,
              height: 58,
              borderRadius: 4,
              marginHorizontal: 4,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              backgroundColor: isFocused ? colors.navBarActive : 'transparent',
              opacity: pressed ? 0.82 : 1,
            })}
          >
            {options.tabBarIcon?.({
              focused: isFocused,
              color: tintColor,
              size: 22,
            })}
            <Text
              numberOfLines={1}
              style={{
                color: tintColor,
                fontFamily: 'IBMPlexMono_500Medium',
                fontSize: 10,
                letterSpacing: 1.4,
                textAlign: 'center',
              }}
            >
              {typeof label === 'string' ? label.toUpperCase() : route.name.toUpperCase()}
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
        tabBarActiveTintColor: colors.navBar,
        tabBarInactiveTintColor: colors.textInverse,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => <Sun color={color} size={size} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: 'Records',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: 'New',
        }}
      />
      <Tabs.Screen
        name="gear"
        options={{
          title: 'Gear',
          tabBarIcon: ({ color, size }) => <HardHat color={color} size={size} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <MoreHorizontal color={color} size={size} strokeWidth={1.8} />
          ),
        }}
      />
    </Tabs>
  );
}
