import React from 'react';
import { Linking, Platform, ScrollView, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { Button, Card, IconBtn, SectionH, ToggleRow, TopBar } from '@/src/ui/primitives/v2';
import { IconArrowLeft, IconBell, IconVerified, IconWarn } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';
import type { NotificationPrefs } from '@/src/storage/local-prefs';
import { useNotificationPermission, useNotificationPrefs } from '@/src/notifications/use-notifications';
import { notifyEvent, notifyTestScheduled } from '@/src/notifications/notify';

const CATEGORIES: { key: keyof NotificationPrefs; label: string; sub: string }[] = [
  {
    key: 'gear',
    label: 'Gear inspections',
    sub: 'Remind me ahead of — and when — a gear inspection falls due, and weekly while it is overdue.',
  },
  {
    key: 'signing',
    label: 'Remote signing',
    sub: 'Tell me when a verifier signs my entry, or when a signature request expires unsigned.',
  },
  {
    key: 'backup',
    label: 'Backup & sync',
    sub: 'Warn me when a cloud backup repeatedly fails so my logbook isn’t left un-backed-up.',
  },
];

export default function NotificationsScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { prefs, loaded, setCategory } = useNotificationPrefs();
  const { granted, canAskAgain, loading, request } = useNotificationPermission();

  const isWeb = Platform.OS === 'web';
  const togglesDisabled = !loaded || !granted || isWeb;

  function onToggle(category: keyof NotificationPrefs) {
    return (next: boolean) => {
      haptics.selection();
      setCategory(category, next);
    };
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title="Notifications"
        subtitle="Reminders on this device — nothing is sent to a server"
        leading={
          <IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.back()} />
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 28 + insets.bottom, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionH kicker="PERMISSION" title="System notifications" />
        <View style={{ paddingHorizontal: 20 }}>
          <PermissionCard
            isWeb={isWeb}
            loading={loading}
            granted={granted}
            canAskAgain={canAskAgain}
            onRequest={request}
            tokens={tokens}
          />
        </View>

        <SectionH kicker="ALERTS" title="What to notify me about" />
        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          {CATEGORIES.map((cat) => (
            <ToggleRow
              key={cat.key}
              label={cat.label}
              sub={cat.sub}
              value={prefs[cat.key]}
              onChange={onToggle(cat.key)}
              disabled={togglesDisabled}
            />
          ))}
        </View>

        {__DEV__ && !isWeb && (
          <>
            <SectionH kicker="DEV" title="Test notifications" />
            <View style={{ paddingHorizontal: 20, gap: 8 }}>
              <Button
                variant="secondary"
                full
                onPress={() => {
                  haptics.selection();
                  notifyEvent('gear', 'Test · now', 'If you see this, notifications work on this device.');
                }}
              >
                Fire a test now
              </Button>
              <Button
                variant="secondary"
                full
                onPress={() => {
                  haptics.selection();
                  notifyTestScheduled(10);
                }}
              >
                Schedule a test in 10s — then background the app
              </Button>
              <Text style={{ ...type.cardSub, color: tokens.textDim, lineHeight: 18 }}>
                Dev builds only. Needs permission granted above. The 10s test exercises the real
                OS-scheduled path; lock the phone to see it fire.
              </Text>
            </View>
          </>
        )}

        <SectionH kicker="ABOUT" title="How these work" />
        <View style={{ paddingHorizontal: 20 }}>
          <Card padding={14}>
            <Text style={{ ...type.cardSub, color: tokens.textDim, lineHeight: 20 }}>
              These are local notifications scheduled by your device — they work offline and no data
              leaves the phone. Inspection and expiry reminders fire at 7am local on their day; signed
              and backup alerts fire the moment the app sees the event.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

interface PermissionCardProps {
  isWeb: boolean;
  loading: boolean;
  granted: boolean;
  canAskAgain: boolean;
  onRequest: () => void;
  tokens: ReturnType<typeof useTheme>['tokens'];
}

function PermissionCard({ isWeb, loading, granted, canAskAgain, onRequest, tokens }: PermissionCardProps) {
  if (isWeb) {
    return (
      <Card padding={14}>
        <Text style={{ ...type.cardSub, color: tokens.textDim, lineHeight: 20 }}>
          Notifications run on the iOS and Android apps, not in the web preview.
        </Text>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card padding={14}>
        <Text style={{ ...type.cardSub, color: tokens.textDim }}>Checking permission…</Text>
      </Card>
    );
  }

  if (granted) {
    return (
      <Card padding={14}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <IconVerified size={22} color={tokens.ok} fill={tokens.okSoft} />
          <Text style={{ ...type.cardTitle, color: tokens.text, flex: 1 }}>
            Notifications are on for this device
          </Text>
        </View>
        <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 8, lineHeight: 20 }}>
          Use the switches below to choose which alerts you receive.
        </Text>
      </Card>
    );
  }

  // Not granted. If the OS will still prompt, offer an in-app enable; otherwise the
  // user has blocked it and must change it in system Settings.
  return (
    <Card padding={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <IconWarn size={22} color={tokens.warn} fill={tokens.warnSoft} />
        <Text style={{ ...type.cardTitle, color: tokens.text, flex: 1 }}>
          {canAskAgain ? 'Notifications are off' : 'Notifications are blocked'}
        </Text>
      </View>
      <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 8, marginBottom: 12, lineHeight: 20 }}>
        {canAskAgain
          ? 'Turn on system notifications to receive inspection, signing, and backup reminders.'
          : 'Notifications are turned off for this app in your device Settings. Re-enable them there to receive reminders.'}
      </Text>
      {canAskAgain ? (
        <Button icon={IconBell} onPress={onRequest} full>
          Enable notifications
        </Button>
      ) : (
        <Button variant="secondary" onPress={() => void Linking.openSettings()} full>
          Open Settings
        </Button>
      )}
    </Card>
  );
}
