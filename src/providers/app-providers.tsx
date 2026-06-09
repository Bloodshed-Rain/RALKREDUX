import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
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
import { ensureSetup as ensureNotificationsSetup } from '@/src/notifications/scheduler';
import { IconBrand } from '@/src/ui/icons';
import { ThemeProvider, useTheme } from '@/src/ui/theme/theme-provider';

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [fontsLoaded, fontError] = useFonts({
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
  const [slowFonts, setSlowFonts] = React.useState(false);

  const runInit = React.useCallback(() => {
    setError(null);
    setDbReady(false);
    initializeDatabase()
      .then(() => setDbReady(true))
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : String(caught));
      });
  }, []);

  React.useEffect(() => {
    runInit();
    void loadHapticsPref();
    // Register the notification handler + Android channels once, at boot. Needs no
    // DB/auth; channels must exist before POST_NOTIFICATIONS is ever requested
    // (Android 13+). The reconciler (a descendant, post-DB) does the scheduling.
    void ensureNotificationsSetup();
  }, [runInit]);

  // Don't block the boot forever on fonts — after a grace period (or immediately
  // if the font load errored) proceed with system fonts. Typography degrades
  // but the app is usable; previously an unresolved useFonts hung the splash.
  React.useEffect(() => {
    if (fontsLoaded) return;
    const t = setTimeout(() => setSlowFonts(true), 10000);
    return () => clearTimeout(t);
  }, [fontsLoaded]);

  const fontsReady = fontsLoaded || slowFonts || Boolean(fontError);
  const booting = !fontsReady || !dbReady;
  const status = error
    ? `Database setup failed — ${error}`
    : !fontsReady
      ? 'Loading typeface'
      : !dbReady
        ? 'Opening local ledger'
        : 'Ready';

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {error || booting ? (
          <BootSplash
            label={status}
            failed={Boolean(error)}
            fontsLoaded={fontsLoaded}
            onRetry={error ? runInit : undefined}
          />
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
  onRetry?: () => void;
}

function BootSplash({ label, failed, fontsLoaded, onRetry }: BootSplashProps) {
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
        Rope Access Logbook
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
      {failed && onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={onRetry}
          hitSlop={8}
          style={{
            marginTop: 8,
            paddingVertical: 10,
            paddingHorizontal: 22,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: tokens.line,
            backgroundColor: tokens.surface,
          }}
        >
          <Text
            style={{
              fontFamily: fontsLoaded ? 'Manrope_600SemiBold' : undefined,
              fontWeight: '600',
              fontSize: 14,
              color: tokens.text,
            }}
          >
            Try again
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
