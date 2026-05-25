import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { Button, Card, IconBtn, SectionH, TopBar } from '@/src/ui/primitives/v2';
import { IconArrowLeft } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';
import { useAuth } from '@/src/providers/auth-provider';
import {
  useBackupNow,
  useCloudBackups,
  useRestoreFromCloud,
} from '@/src/domain/cloud-backup/use-cloud-backup';
import { CloudBackupRow } from '@/src/domain/cloud-backup/types';

function formatBackupTime(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleString();
}

function backupSummaryLine(row: CloudBackupRow): string {
  const kb = Math.max(1, Math.round(row.byte_size / 1024));
  return `${row.entry_count} entries · ${row.gear_count} gear · ${kb} KB`;
}

function providerLabel(provider: unknown): string {
  switch (provider) {
    case 'apple':
      return 'Apple';
    case 'google':
      return 'Google';
    case 'email':
      return 'Email';
    default:
      return 'Account';
  }
}

export default function AccountScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { configured, user, signOut } = useAuth();
  const [signingOut, setSigningOut] = React.useState(false);

  const provider = providerLabel(user?.app_metadata?.provider);
  const email = user?.email ?? 'Signed in';

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      haptics.success();
      // Signing out flips the gate to the sign-in screen automatically.
    } catch {
      haptics.error();
      setSigningOut(false);
    }
  }

  const backupsQuery = useCloudBackups();
  const backupNow = useBackupNow();
  const restore = useRestoreFromCloud();
  const backups = backupsQuery.data?.ok ? backupsQuery.data.backups : [];
  const lastBackup = backups[0] ?? null;

  async function onBackupNow() {
    const result = await backupNow.mutateAsync();
    if (result.ok) {
      haptics.success();
    } else {
      haptics.error();
      Alert.alert('Backup failed', 'Could not back up to the cloud. Please try again.');
    }
  }

  async function runRestore(backupId: string, force: boolean) {
    const result = await restore.mutateAsync({ backupId, force });
    if (result.ok) {
      haptics.success();
      Alert.alert('Restored', `Recovered ${result.entries} entries from the cloud.`);
      return;
    }
    if (result.reason === 'needs_confirmation') {
      Alert.alert(
        'Replace everything on this device?',
        'Restoring overwrites the logbook currently on this device with the cloud copy. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Wipe & restore',
            style: 'destructive',
            onPress: () => {
              void runRestore(backupId, true);
            },
          },
        ],
      );
      return;
    }
    haptics.error();
    Alert.alert(
      'Restore failed',
      result.reason === 'snapshot_newer'
        ? 'This backup was made by a newer app version. Update the app, then try again.'
        : 'Could not restore from the cloud. Please try again.',
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title="Account"
        subtitle="Sign-in and subscription"
        leading={<IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.back()} />}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 28 + insets.bottom, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {!configured ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <Card padding={14}>
              <Text style={{ ...type.cardSub, color: tokens.textDim, lineHeight: 20 }}>
                Cloud accounts aren&apos;t configured in this build. The logbook works fully
                offline; sign-in becomes available once the backend is set up.
              </Text>
            </Card>
          </View>
        ) : (
          <>
            <SectionH kicker="SIGNED IN" title="Your account" />
            <View style={{ paddingHorizontal: 20, gap: 8 }}>
              <Card padding={14}>
                <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>{provider.toUpperCase()}</Text>
                <Text style={{ ...type.cardTitle, color: tokens.text, marginTop: 4 }}>{email}</Text>
              </Card>
            </View>

            <SectionH kicker="CLOUD BACKUP" title="Backup & restore" />
            <View style={{ paddingHorizontal: 20, gap: 8 }}>
              <Card padding={14}>
                <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>LAST BACKUP</Text>
                <Text style={{ ...type.cardTitle, color: tokens.text, marginTop: 4 }}>
                  {lastBackup ? formatBackupTime(lastBackup.created_at) : 'No cloud backups yet'}
                </Text>
                <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4, lineHeight: 20 }}>
                  {lastBackup
                    ? backupSummaryLine(lastBackup)
                    : 'Your logbook backs up automatically after you sign an entry, and whenever you tap below.'}
                </Text>
              </Card>
              <Button full disabled={backupNow.isPending} onPress={onBackupNow}>
                {backupNow.isPending ? 'Backing up…' : 'Back up now'}
              </Button>
            </View>

            {backups.length > 0 ? (
              <>
                <SectionH kicker="RESTORE" title="Restore from cloud" />
                <View style={{ paddingHorizontal: 20, gap: 8 }}>
                  {backups.map((b) => (
                    <Card key={b.id} padding={14}>
                      <Text style={{ ...type.cardTitle, color: tokens.text }}>
                        {formatBackupTime(b.created_at)}
                      </Text>
                      <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4 }}>
                        {backupSummaryLine(b)}
                      </Text>
                      <View style={{ marginTop: 10 }}>
                        <Button
                          variant="ghost"
                          disabled={restore.isPending}
                          onPress={() => {
                            void runRestore(b.id, false);
                          }}
                        >
                          Restore this backup
                        </Button>
                      </View>
                    </Card>
                  ))}
                </View>
              </>
            ) : null}

            <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
              <Button variant="danger" full disabled={signingOut} onPress={onSignOut}>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
