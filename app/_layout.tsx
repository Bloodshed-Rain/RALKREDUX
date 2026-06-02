import { Stack } from 'expo-router';
import { AppProviders } from '@/src/providers/app-providers';
import { AuthProvider } from '@/src/providers/auth-provider';
import { AuthGate } from '@/src/providers/auth-gate';
import { AppLock } from '@/src/providers/app-lock';
import { TamperGuard } from '@/src/providers/tamper-guard';
import { useTheme } from '@/src/ui/theme/theme-provider';

function ThemedStack() {
  const { tokens } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: { backgroundColor: tokens.surface },
        headerShadowVisible: false,
        headerTintColor: tokens.text,
        headerTitleStyle: {
          fontFamily: 'Manrope_700Bold',
          fontSize: 17,
          fontWeight: '700',
        },
        contentStyle: { backgroundColor: tokens.bg },
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
      {/* Every screen below renders its own v2 `TopBar` — suppress the
          native stack header so we don't get the double-bar regression. */}
      <Stack.Screen name="entry/[id]" options={{ title: 'Entry', headerShown: false }} />
      <Stack.Screen
        name="entry/[id]/edit"
        options={{ title: 'Edit draft', presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen name="entry/[id]/sign" options={{ title: 'Local sign', headerShown: false }} />
      <Stack.Screen
        name="entry/[id]/request-signature"
        options={{ title: 'Remote request', presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="entry/[id]/amend"
        options={{ title: 'Amend entry', presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="verify/[code]"
        options={{ title: 'Remote verification', headerShown: false }}
      />
      <Stack.Screen name="gear/[id]" options={{ title: 'Gear', headerShown: false }} />
      <Stack.Screen name="gear/catalog" options={{ title: 'Gear catalog', headerShown: false }} />
      <Stack.Screen name="export" options={{ title: 'Audit export', headerShown: false }} />
      {/* These self-declare headerShown:false in-component; registering them
          here keeps the chrome contract in one place from the first frame. */}
      <Stack.Screen name="account" options={{ title: 'Account', headerShown: false }} />
      <Stack.Screen name="security" options={{ title: 'Security', headerShown: false }} />
      <Stack.Screen name="attachments" options={{ title: 'Attachments', headerShown: false }} />
      <Stack.Screen name="profile-edit" options={{ title: 'Edit profile', headerShown: false }} />
      <Stack.Screen name="hours-baseline" options={{ title: 'Starting hours', headerShown: false }} />
      <Stack.Screen name="archives/index" options={{ title: 'Legacy logbook', headerShown: false }} />
      <Stack.Screen name="archives/new" options={{ title: 'Add paper logbook', headerShown: false }} />
      <Stack.Screen name="archives/[id]" options={{ title: 'Archive', headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <AuthProvider>
        <AuthGate>
          <AppLock>
            <TamperGuard>
              <ThemedStack />
            </TamperGuard>
          </AppLock>
        </AuthGate>
      </AuthProvider>
    </AppProviders>
  );
}
