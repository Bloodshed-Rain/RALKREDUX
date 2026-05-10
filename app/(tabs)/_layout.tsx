import { Tabs } from 'expo-router';
import { BookOpen, HardHat, Home, User } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/ui/theme/tokens';

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
              borderRadius: 16,
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
              size: 24,
            })}
            <Text
              numberOfLines={1}
              style={{
                color: tintColor,
                fontFamily: 'Inter_600SemiBold',
                fontSize: 11,
                lineHeight: 14,
                textAlign: 'center',
              }}
            >
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
        tabBarActiveTintColor: colors.navBar,
        tabBarInactiveTintColor: colors.textInverse,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={1.8} />,
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
        name="gear"
        options={{
          title: 'Gear',
          tabBarIcon: ({ color, size }) => <HardHat color={color} size={size} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} strokeWidth={1.8} />,
        }}
      />
    </Tabs>
  );
}
