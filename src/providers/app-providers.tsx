import React from 'react';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  Archivo_700Bold,
  Archivo_800ExtraBold,
  Archivo_900Black,
} from '@expo-google-fonts/archivo';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  Newsreader_500Medium_Italic,
  Newsreader_700Bold_Italic,
} from '@expo-google-fonts/newsreader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeDatabase } from '@/src/db/initialize';
import { SplashScreen } from '@/src/ui/primitives';
import { ThemeProvider } from '@/src/ui/theme/theme-provider';

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Archivo_900Black,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    Newsreader_500Medium_Italic,
    Newsreader_700Bold_Italic,
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

  const booting = !fontsLoaded || !dbReady;
  const splashLabel = error
    ? `Database setup failed - ${error}`
    : !fontsLoaded
      ? 'Loading typeface'
      : !dbReady
        ? 'Opening local ledger'
        : 'Ready';

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {error || booting ? (
          <SplashScreen label={splashLabel} ready={!booting && !error} />
        ) : (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
