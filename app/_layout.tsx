import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/src/providers/app-providers';
import { colors, typography } from '@/src/ui/theme/tokens';

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
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
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="entry/new" options={{ title: 'New entry', presentation: 'modal' }} />
        <Stack.Screen name="entry/[id]" options={{ title: 'Entry' }} />
        <Stack.Screen name="entry/[id]/edit" options={{ title: 'Edit draft', presentation: 'modal' }} />
        <Stack.Screen name="entry/[id]/sign" options={{ title: 'Local sign', presentation: 'modal' }} />
        <Stack.Screen name="entry/[id]/request-signature" options={{ title: 'Remote request', presentation: 'modal' }} />
        <Stack.Screen name="entry/[id]/amend" options={{ title: 'Amend entry', presentation: 'modal' }} />
        <Stack.Screen name="verify/[code]" options={{ title: 'Remote verification' }} />
      </Stack>
    </AppProviders>
  );
}
