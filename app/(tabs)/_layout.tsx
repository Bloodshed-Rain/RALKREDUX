import { Tabs } from 'expo-router';
import { BookOpen, HardHat, Home, User } from 'lucide-react-native';
import { colors } from '@/src/ui/theme/tokens';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentPressed,
        tabBarInactiveTintColor: colors.textInverse,
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 11,
        },
        tabBarItemStyle: {
          borderRadius: 8,
          marginVertical: 6,
          marginHorizontal: 3,
        },
        tabBarActiveBackgroundColor: colors.bgApp,
        tabBarStyle: {
          backgroundColor: colors.accentPressed,
          borderTopColor: colors.accentPressed,
          minHeight: 64,
          paddingTop: 4,
          paddingBottom: 6,
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
