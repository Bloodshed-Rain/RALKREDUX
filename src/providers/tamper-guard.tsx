import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useVerifyFullChain } from '@/src/domain/logbook/use-logbook';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { IconWarn } from '@/src/ui/icons';
import { Button } from '@/src/ui/primitives/v2';

export function TamperGuard({ children }: { children: React.ReactNode }) {
  const query = useVerifyFullChain();
  const { tokens } = useTheme();
  // `null` until the user makes a choice on the integrity screen. Once set we
  // render the app so they can always reach Export / Backup — the guard must
  // never become an inescapable dead-end. (A false positive would otherwise
  // strand the user with no in-app recovery and no OTA channel to push a fix.)
  const [escape, setEscape] = React.useState<null | 'export' | 'app'>(null);

  React.useEffect(() => {
    if (escape === 'export') router.replace('/export');
  }, [escape]);

  // Render normally while loading, when the chain verifies, or once the user
  // has explicitly chosen to continue.
  if (!query.data || query.data.valid || escape) {
    return <>{children}</>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.dangerSoft }}
      contentContainerStyle={{ flexGrow: 1, padding: 32, alignItems: 'center', justifyContent: 'center', gap: 16 }}
    >
      <IconWarn size={64} color={tokens.danger} fill={tokens.danger} />
      <Text style={{ fontSize: 24, color: tokens.danger, fontFamily: 'Manrope_800ExtraBold', textAlign: 'center' }}>
        Logbook Integrity Check Failed
      </Text>
      <Text style={{ fontSize: 16, color: tokens.text, fontFamily: 'Manrope_600SemiBold', textAlign: 'center', lineHeight: 24 }}>
        The cryptographic signature chain did not verify. This usually means the
        local database was changed outside the app — but it can also happen if a
        record is corrupted. Your signed records are still on this device.
      </Text>
      <Text style={{ fontSize: 15, color: tokens.text, fontFamily: 'Manrope_500Medium', textAlign: 'center', lineHeight: 22 }}>
        Export an audit copy now, then restore from a trusted backup.
      </Text>
      {query.data.brokenAtEntryId ? (
        <View style={{ padding: 16, backgroundColor: tokens.surface, borderRadius: 8, width: '100%' }}>
          <Text style={{ fontSize: 14, color: tokens.textDim, fontFamily: 'JetBrainsMono_500Medium' }}>
            First break at entry: {query.data.brokenAtEntryId}
          </Text>
        </View>
      ) : null}
      <View style={{ width: '100%', gap: 10, marginTop: 8 }}>
        <Button variant="primary" full onPress={() => setEscape('export')}>
          Export my data
        </Button>
        <Button variant="ghost" full onPress={() => setEscape('app')}>
          Continue to app
        </Button>
      </View>
    </ScrollView>
  );
}
