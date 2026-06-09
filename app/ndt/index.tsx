import React from 'react';
import { View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useNdtInspections, useNdtSummary } from '@/src/domain/ndt/use-ndt';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { IconBtn, TopBar } from '@/src/ui/primitives/v2';
import { IconPlus } from '@/src/ui/icons';
import { NdtLedger } from '@/src/ui/ndt/ndt-ledger';

function formatHours(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Standalone NDT ledger route. Thin host: own TopBar (with the +New action and
 * the accrued-hours subtitle) + the shared <NdtLedger/> body. The ledger owns
 * data; this route re-reads `useNdtSummary()` only for the subtitle — React
 * Query dedupes the cache, so the second read is free.
 */
export default function NdtLedgerScreen() {
  const inspections = useNdtInspections();
  const summary = useNdtSummary();
  const { tokens } = useTheme();

  const hasData = (inspections.data?.length ?? 0) > 0;
  const selfLoggedHours = summary.data?.selfLoggedHours ?? 0;
  const verifiedHours = summary.data?.verifiedHours ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* NDT routes self-suppress the native header (each renders its own v2
          TopBar) to avoid the double-bar regression. */}
      <Stack.Screen options={{ headerShown: false }} />

      <TopBar
        title="NDT ledger"
        subtitle={
          !hasData
            ? 'No NDT records yet'
            : `${formatHours(selfLoggedHours)}h self-logged · ${formatHours(verifiedHours)}h verified`
        }
        large
        trailing={
          <IconBtn
            icon={IconPlus}
            label="New NDT record"
            size="md"
            onPress={() => router.push('/ndt/new' as never)}
          />
        }
      />

      <NdtLedger
        onOpenRecord={(id) => router.push(`/ndt/${id}` as never)}
        onNewRecord={() => router.push('/ndt/new' as never)}
      />
    </View>
  );
}
