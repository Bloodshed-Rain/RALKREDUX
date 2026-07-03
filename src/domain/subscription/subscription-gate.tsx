import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { IconBrand } from '@/src/ui/icons';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { SubscriptionPaywall } from '@/src/ui/subscription/subscription-paywall';
import { useSubscription } from './subscription-provider';

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const subscription = useSubscription();
  const { tokens } = useTheme();

  if (!subscription.configured || subscription.status === 'unavailable' || subscription.active) {
    return <>{children}</>;
  }

  if (subscription.status === 'loading') {
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

  // Only a CONFIRMED lack of entitlement blocks. 'needs_connection' and
  // 'error' mean we couldn't verify either way — offline-first rule: never
  // lock a signed-in technician out of the canonical local logbook on an
  // unknown. Verification retries on the next refresh/app start.
  if (subscription.status === 'inactive') {
    return <SubscriptionPaywall />;
  }

  return <>{children}</>;
}
