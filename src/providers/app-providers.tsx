import React from 'react';
import { Text, View } from 'react-native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeDatabase } from '@/src/db/initialize';
import { ThemeProvider } from '@/src/ui/theme/theme-provider';
import { colors, typography } from '@/src/ui/theme/tokens';

const queryClient = new QueryClient();

function BootScreen({ label }: { label: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bgApp,
        padding: 24,
      }}
    >
      <Text selectable style={{ ...typography.bodyMed, color: colors.textPrimary, textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [dbReady, setDbReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    initializeDatabase()
      .then(() => setDbReady(true))
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : String(caught));
      });
  }, []);

  if (error) return <BootScreen label={`Database setup failed: ${error}`} />;
  if (!fontsLoaded || !dbReady) return <BootScreen label="Preparing logbook" />;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
