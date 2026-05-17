import { Stack } from 'expo-router';
import { AppProviders } from '@/src/providers/app-providers';
import { useTheme } from '@/src/ui/theme/theme-provider';

function ThemedStack() {
  const { colors, typography } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: { backgroundColor: colors.bgSurface },
        headerShadowVisible: false,
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontFamily: typography.title2.fontFamily,
          fontSize: typography.title2.fontSize,
          fontWeight: typography.title2.fontWeight,
        },
        contentStyle: { backgroundColor: colors.bgApp },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, title: 'RALB' }} />
      <Stack.Screen name="(onboarding)/setup" options={{ headerShown: false, title: 'Set up' }} />
      <Stack.Screen name="(onboarding)/intro" options={{ headerShown: false, title: 'Welcome' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'RALB' }} />
      <Stack.Screen
        name="entry/new"
        options={{ title: 'New entry', presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen name="entry/[id]" options={{ title: 'Entry' }} />
      <Stack.Screen name="entry/[id]/edit" options={{ title: 'Edit draft', presentation: 'modal' }} />
      <Stack.Screen name="entry/[id]/sign" options={{ title: 'Local sign' }} />
      <Stack.Screen
        name="entry/[id]/request-signature"
        options={{ title: 'Remote request', presentation: 'modal' }}
      />
      <Stack.Screen name="entry/[id]/amend" options={{ title: 'Amend entry', presentation: 'modal' }} />
      <Stack.Screen name="verify/[code]" options={{ title: 'Remote verification' }} />
      <Stack.Screen name="gear/[id]" options={{ title: 'Gear', headerShown: false }} />
      <Stack.Screen name="export" options={{ title: 'Audit export', headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <ThemedStack />
    </AppProviders>
  );
}
