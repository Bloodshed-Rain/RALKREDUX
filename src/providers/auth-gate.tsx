import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from './auth-provider';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { IconBrand } from '@/src/ui/icons';
import { AuthScreen } from '@/src/ui/auth/auth-screen';

/**
 * Account gate. An account is required to use the app — BUT only the first
 * sign-in needs connectivity: `AuthProvider` resolves the persisted session
 * from storage, so a previously signed-in user passes the gate fully offline.
 *
 * When the optional Supabase cloud layer isn't configured (local dev, web
 * preview, or a build without `EXPO_PUBLIC_SUPABASE_*`), the gate falls through
 * so the offline-first logbook keeps working without a backend.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { configured, status } = useAuth();
  const { tokens } = useTheme();

  if (!configured) return <>{children}</>;

  if (status === 'loading') {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' },
        ]}
      >
        <IconBrand size={64} color={tokens.accent} fill={tokens.accent} />
        <ActivityIndicator color={tokens.accent} style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (status === 'signed_out') return <AuthScreen />;

  return <>{children}</>;
}
