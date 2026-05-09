import { Tabs } from 'expo-router';
import { BookOpen, HardHat, Home, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/ui/theme/tokens';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const tabBarHeight = 64 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentPressed,
        tabBarInactiveTintColor: colors.textInverse,
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 11,
          paddingBottom: 2,
        },
        tabBarItemStyle: {
          height: 48,
          borderRadius: 16,
          marginHorizontal: 5,
          marginTop: 6,
          marginBottom: 6,
          paddingVertical: 3,
          overflow: 'hidden',
        },
        tabBarActiveBackgroundColor: colors.bgApp,
        tabBarStyle: {
          backgroundColor: colors.accentPressed,
          borderTopColor: colors.accentPressed,
          height: tabBarHeight,
          paddingHorizontal: 6,
          paddingTop: 4,
          paddingBottom: bottomInset,
        },
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
