import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { Button, Card, IconBtn, SectionH, TopBar } from '@/src/ui/primitives/v2';
import { IconArrowLeft } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';
import { useAuth } from '@/src/providers/auth-provider';
import { useSubscription } from '@/src/domain/subscription/subscription-provider';
import { STORE_DISPLAY_NAME, STORE_RELEASE_COPY } from '@/src/domain/subscription/store-details';
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

function formatSubscriptionDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AccountScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { configured, user, signOut, deleteAccount } = useAuth();
  const subscription = useSubscription();
  const [signingOut, setSigningOut] = React.useState(false);
  const [deletingAccount, setDeletingAccount] = React.useState(false);
  const [seeding, setSeeding] = React.useState(false);
  const queryClient = useQueryClient();

  // Dev-only: populate realistic demo data for App Store screenshots. The
  // handler (and the seed module behind the inline require) is stripped from
  // release bundles by __DEV__ dead-code elimination.
  async function onSeedDemoData() {
    if (!__DEV__) return;
    setSeeding(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { seedDemoData } = require('@/src/dev/seed-demo-data') as typeof import('@/src/dev/seed-demo-data');
      const result = await seedDemoData();
      await queryClient.invalidateQueries();
      haptics.success();
      Alert.alert(
        'Demo data seeded',
        `${result.entries} entries (${result.signedEntries} signed), ${result.gearItems} gear items, ${result.ndtInspections} NDT inspections.`,
      );
    } catch (caught) {
      haptics.error();
      Alert.alert(
        'Seed failed',
        caught instanceof Error && caught.message === 'seed_refused_logbook_not_empty'
          ? 'The logbook already has entries — seeding only runs on an empty logbook.'
          : 'Could not seed demo data. See Metro logs.',
      );
    } finally {
      setSeeding(false);
    }
  }

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
      // A failed/offline revoke must not look like a no-op. The session is still
      // valid locally (we keep offline access intact on revoke failure), so say so.
      Alert.alert(
        'Could not sign out',
        'We couldn’t reach the server to end your session. You’re still signed in — try again when you have a connection.',
      );
    }
  }

  const backupsQuery = useCloudBackups();
  const backupNow = useBackupNow();
  const restore = useRestoreFromCloud();
  const backups = backupsQuery.data?.ok ? backupsQuery.data.backups : [];
  const lastBackup = backups[0] ?? null;
  // A list FAILURE must not read as "no backups" on the disaster-recovery
  // screen — someone recovering a lost device would believe they have nothing.
  const backupListFailed = backupsQuery.isError || (!!backupsQuery.data && !backupsQuery.data.ok);
  const backupListLoading = !backupsQuery.data && !backupsQuery.isError;

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

  async function onRestorePurchases() {
    try {
      const result = await subscription.restore();
      if (result.active) {
        haptics.success();
        Alert.alert('Restored', 'Your subscription is active on this device.');
      } else {
        haptics.selection();
        Alert.alert('No active purchase', 'We could not find an active subscription for this store account.');
      }
    } catch {
      haptics.error();
      Alert.alert('Restore failed', 'The store could not restore purchases. Please try again.');
    }
  }

  async function onManageSubscription() {
    const opened = await subscription.manageSubscription();
    if (!opened) {
      haptics.error();
      Alert.alert('No subscription link', 'The store did not provide a subscription management link yet.');
    }
  }

  async function onRetrySubscription() {
    await subscription.refresh();
  }

  function onDeleteAccount() {
    Alert.alert(
      'Delete your account?',
      `This permanently deletes your cloud account, all cloud backups, and any pending remote-signing links. It cannot be undone.\n\nThe logbook stored on this device is not deleted. An active subscription is managed by ${STORE_DISPLAY_NAME} and must be cancelled there.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void runDeleteAccount();
          },
        },
      ],
    );
  }

  async function runDeleteAccount() {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      haptics.success();
      // Account is gone and the local session is cleared — the gate flips to
      // the sign-in screen automatically.
    } catch {
      haptics.error();
      setDeletingAccount(false);
      // Honest on partial failure: the server deletes cloud data BEFORE the
      // auth user (so a retry can always finish the job), which means a late
      // failure may leave backups already removed. Never claim "nothing was
      // changed".
      Alert.alert(
        'Account deletion did not finish',
        'Some cloud data may already have been removed, but your account still exists and your sign-in and this device’s logbook are unchanged. Check your connection and try again to finish deleting the account.',
      );
    }
  }

  const activeSub = subscription.activeEntitlement;
  const subExpires = formatSubscriptionDate(
    activeSub?.expirationDate ?? subscription.cached?.expirationDate,
  );
  const subStatusTitle = !subscription.configured
    ? 'Not configured in this build'
    : subscription.status === 'active'
      ? subExpires
        ? `Active through ${subExpires}`
        : 'Active'
      : subscription.status === 'inactive'
        ? 'No active subscription'
        : subscription.status === 'loading'
          ? 'Checking subscription...'
          : subscription.status === 'needs_connection'
            ? 'Needs connection'
            : 'Could not verify subscription';
  const subStatusBody = !subscription.configured
    ? STORE_RELEASE_COPY
    : subscription.status === 'active'
      ? activeSub?.willRenew === false
        ? 'Cancelled in the store, but access remains active until the end of the paid period.'
        : 'Your store subscription unlocks this account.'
      : subscription.error ??
        subscription.planIssue ??
        'Restore a purchase or subscribe from the paywall to unlock access.';

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title="Account"
        subtitle="Sign-in and sign out"
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

            <SectionH kicker="BILLING" title="Subscription" />
            <View style={{ paddingHorizontal: 20, gap: 8 }}>
              <Card padding={14}>
                <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>
                  {subscription.entitlementId.toUpperCase()}
                </Text>
                <Text style={{ ...type.cardTitle, color: tokens.text, marginTop: 4 }}>
                  {subStatusTitle}
                </Text>
                <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4, lineHeight: 20 }}>
                  {subStatusBody}
                </Text>
              </Card>
              {subscription.configured ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button
                    variant="outline"
                    grow
                    disabled={subscription.busy !== 'none'}
                    onPress={onRestorePurchases}
                  >
                    {subscription.busy === 'restore' ? 'Restoring...' : 'Restore'}
                  </Button>
                  {subscription.status === 'active' ? (
                    <Button
                      variant="ghost"
                      grow
                      disabled={subscription.busy !== 'none'}
                      onPress={onManageSubscription}
                    >
                      Manage
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      grow
                      disabled={subscription.busy !== 'none'}
                      onPress={onRetrySubscription}
                    >
                      Retry
                    </Button>
                  )}
                </View>
              ) : null}
            </View>

            <SectionH kicker="CLOUD BACKUP" title="Backup & restore" />
            <View style={{ paddingHorizontal: 20, gap: 8 }}>
              <Card padding={14}>
                <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>LAST BACKUP</Text>
                <Text style={{ ...type.cardTitle, color: tokens.text, marginTop: 4 }}>
                  {backupListLoading
                    ? 'Checking for cloud backups…'
                    : backupListFailed
                      ? 'Couldn’t load your cloud backups'
                      : lastBackup
                        ? formatBackupTime(lastBackup.created_at)
                        : 'No cloud backups yet'}
                </Text>
                <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4, lineHeight: 20 }}>
                  {backupListLoading
                    ? 'Looking for backups saved to the cloud.'
                    : backupListFailed
                      ? 'This is a connection problem, not an empty account — check your internet and retry.'
                      : lastBackup
                        ? backupSummaryLine(lastBackup)
                        : 'Your logbook backs up automatically after you sign an entry, and whenever you tap below.'}
                </Text>
                {backupListFailed ? (
                  <View style={{ marginTop: 10 }}>
                    <Button variant="ghost" onPress={() => void backupsQuery.refetch()}>
                      Retry
                    </Button>
                  </View>
                ) : null}
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
              <Button variant="danger" full disabled={signingOut || deletingAccount} onPress={onSignOut}>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </View>

            <SectionH kicker="DANGER ZONE" title="Delete account" />
            <View style={{ paddingHorizontal: 20, gap: 8 }}>
              <Card padding={14}>
                <Text style={{ ...type.cardSub, color: tokens.textDim, lineHeight: 20 }}>
                  Permanently deletes your cloud account, cloud backups, and pending
                  remote-signing links. The logbook stored on this device stays. An active
                  subscription is billed by {STORE_DISPLAY_NAME} — cancel it there as well.
                </Text>
              </Card>
              <Button
                variant="danger"
                full
                disabled={deletingAccount || signingOut}
                onPress={onDeleteAccount}
              >
                {deletingAccount ? 'Deleting account…' : 'Delete account'}
              </Button>
            </View>
          </>
        )}

        {__DEV__ ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <Button variant="outline" full disabled={seeding} onPress={onSeedDemoData}>
              {seeding ? 'Seeding…' : 'DEV: Seed demo data'}
            </Button>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
