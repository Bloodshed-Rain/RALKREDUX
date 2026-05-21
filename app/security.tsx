import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Card,
  ChipSelect,
  IconBtn,
  SectionH,
  ToggleRow,
  TopBar,
} from '@/src/ui/primitives/v2';
import { IconArrowLeft } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';
import {
  AUTO_LOCK_OPTIONS,
  DEFAULT_AUTO_LOCK_MINUTES,
  PrefKeys,
  isAutoLockMinutesPref,
  readPref,
  writePref,
  type AutoLockMinutesPref,
} from '@/src/storage/local-prefs';

function autoLockLabel(value: AutoLockMinutesPref): string {
  if (value === 0) return 'Never';
  if (value === 1) return '1 min';
  if (value < 60) return `${value} min`;
  return `${value / 60} hr`;
}

// ChipSelect is generic over string values, so we serialize the numeric pref
// at the UI boundary and parse it back on change.
const AUTO_LOCK_CHIP_OPTIONS = AUTO_LOCK_OPTIONS.map((value) => ({
  value: String(value),
  label: autoLockLabel(value),
}));

export default function SecurityScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [deviceLockEnabled, setDeviceLockEnabled] = React.useState(false);
  const [autoLockMinutes, setAutoLockMinutes] = React.useState<AutoLockMinutesPref>(
    DEFAULT_AUTO_LOCK_MINUTES,
  );
  const [biometricForSigning, setBiometricForSigning] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const [lock, minutes, sign] = await Promise.all([
        readPref<boolean>(PrefKeys.deviceLockEnabled, false),
        readPref<AutoLockMinutesPref>(PrefKeys.autoLockMinutes, DEFAULT_AUTO_LOCK_MINUTES),
        readPref<boolean>(PrefKeys.biometricForSigning, false),
      ]);
      setDeviceLockEnabled(lock);
      setAutoLockMinutes(isAutoLockMinutesPref(minutes) ? minutes : DEFAULT_AUTO_LOCK_MINUTES);
      setBiometricForSigning(sign);
      setLoaded(true);
    })();
  }, []);

  function persistDeviceLock(next: boolean) {
    setDeviceLockEnabled(next);
    haptics.selection();
    writePref(PrefKeys.deviceLockEnabled, next);
  }

  function persistAutoLock(next: AutoLockMinutesPref) {
    setAutoLockMinutes(next);
    haptics.selection();
    writePref(PrefKeys.autoLockMinutes, next);
  }

  function persistBiometricForSigning(next: boolean) {
    setBiometricForSigning(next);
    haptics.selection();
    writePref(PrefKeys.biometricForSigning, next);
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title="Security"
        subtitle="Device lock and signing prompts"
        leading={
          <IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.back()} />
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 28 + insets.bottom, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionH kicker="DEVICE" title="Lock the app" />
        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          <ToggleRow
            label="Require unlock on open"
            sub="Prompt for Face ID / Touch ID / device passcode when the app launches or returns from background."
            value={deviceLockEnabled}
            onChange={persistDeviceLock}
            disabled={!loaded}
          />
          <Card padding={14}>
            <Text style={{ ...type.cardTitle, color: tokens.text }}>Auto-lock idle</Text>
            <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 4, marginBottom: 10 }}>
              Re-prompt for unlock after this much idle time. Has no effect if device lock is off.
            </Text>
            <ChipSelect
              value={String(autoLockMinutes)}
              options={AUTO_LOCK_CHIP_OPTIONS}
              onChange={(v) => {
                const next = Number(v);
                if (isAutoLockMinutesPref(next)) persistAutoLock(next);
              }}
            />
          </Card>
        </View>

        <SectionH kicker="SIGNING" title="Signature confirmation" />
        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          <ToggleRow
            label="Biometric prompt before signing"
            sub="Require Face ID / Touch ID / passcode just before sealing an entry into the chain. Independent of the app-open lock."
            value={biometricForSigning}
            onChange={persistBiometricForSigning}
            disabled={!loaded}
          />
        </View>

        <SectionH kicker="ABOUT" title="What's protected" />
        <View style={{ paddingHorizontal: 20 }}>
          <Card padding={14}>
            <Text style={{ ...type.cardSub, color: tokens.textDim, lineHeight: 20 }}>
              The local SQLite ledger is the source of truth — entries are hash-chained and
              immutable once signed. Device lock prevents casual access by someone holding the
              unlocked phone. The chain itself is not encrypted on disk; treat the device's own
              file-system encryption (FileVault / iOS Data Protection) as the at-rest guard.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
