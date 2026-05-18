import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import {
  Newsreader_600SemiBold_Italic,
  useFonts,
} from '@expo-google-fonts/newsreader';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeDatabase } from '@/src/db/initialize';
import { loadHapticsPref } from '@/src/ui/haptics';
import { IconBrand } from '@/src/ui/icons';
import { ThemeProvider, useTheme } from '@/src/ui/theme/theme-provider';

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
    Newsreader_600SemiBold_Italic,
  });
  const [dbReady, setDbReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    initializeDatabase()
      .then(() => setDbReady(true))
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : String(caught));
      });
    void loadHapticsPref();
  }, []);

  const booting = !fontsLoaded || !dbReady;
  const status = error
    ? `Database setup failed — ${error}`
    : !fontsLoaded
      ? 'Loading typeface'
      : !dbReady
        ? 'Opening local ledger'
        : 'Ready';

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {error || booting ? (
          <BootSplash label={status} failed={Boolean(error)} fontsLoaded={fontsLoaded} />
        ) : (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

interface BootSplashProps {
  label: string;
  failed: boolean;
  fontsLoaded: boolean;
}

function BootSplash({ label, failed, fontsLoaded }: BootSplashProps) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <IconBrand size={76} color={tokens.text} fill={tokens.accent} />
      <Text
        style={
          fontsLoaded
            ? {
                fontFamily: 'Manrope_800ExtraBold',
                fontWeight: '800',
                fontSize: 18,
                letterSpacing: -0.4,
                color: tokens.text,
              }
            : { fontSize: 18, fontWeight: '800', color: tokens.text }
        }
      >
        RALB
      </Text>
      <ActivityIndicator color={tokens.accent} />
      <Text
        style={
          fontsLoaded
            ? {
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 11,
                letterSpacing: 1.8,
                textTransform: 'uppercase',
                color: failed ? tokens.danger : tokens.textDim,
              }
            : {
                fontSize: 11,
                letterSpacing: 1.8,
                textTransform: 'uppercase',
                color: failed ? tokens.danger : tokens.textDim,
              }
        }
      >
        {label}
      </Text>
    </View>
  );
}
