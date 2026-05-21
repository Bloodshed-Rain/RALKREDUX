import * as LocalAuthentication from 'expo-local-authentication';
import React from 'react';
import { ActivityIndicator, AppState, type AppStateStatus, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { IconBrand } from '@/src/ui/icons';
import { Button } from '@/src/ui/primitives/v2';
import {
  DEFAULT_AUTO_LOCK_MINUTES,
  PrefKeys,
  isAutoLockMinutesPref,
  readPref,
  type AutoLockMinutesPref,
} from '@/src/storage/local-prefs';

type Phase = 'checking' | 'locked' | 'unlocked';

export function AppLock({ children }: { children: React.ReactNode }) {
  // Start in 'checking' (NOT unlocked) so protected content never flashes
  // before the async pref + enrollment check resolves. __DEV__ bypasses.
  const [phase, setPhase] = React.useState<Phase>(__DEV__ ? 'unlocked' : 'checking');
  const { tokens } = useTheme();
  const appState = React.useRef(AppState.currentState);
  const backgroundedAt = React.useRef<number | null>(null);
  const authingRef = React.useRef(false);

  const authenticate = React.useCallback(async () => {
    if (authingRef.current) return;
    authingRef.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Logbook',
        // Fall back to the device passcode/PIN when biometrics are unavailable
        // or fail, so the lock still works without Face/Touch ID enrolled.
        disableDeviceFallback: false,
      });
      if (result.success) setPhase('unlocked');
    } finally {
      authingRef.current = false;
    }
  }, []);

  // Decide whether the app should be locked right now, honoring the user's
  // Security settings, then prompt if so.
  const evaluateLock = React.useCallback(async () => {
    if (__DEV__) {
      setPhase('unlocked');
      return;
    }
    const enabled = await readPref<boolean>(PrefKeys.deviceLockEnabled, false);
    if (!enabled) {
      setPhase('unlocked');
      return;
    }
    // Without ANY enrolled auth method (biometric OR device passcode) we can't
    // lock without stranding the user — stay open.
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level === LocalAuthentication.SecurityLevel.NONE) {
      setPhase('unlocked');
      return;
    }
    setPhase('locked');
    await authenticate();
  }, [authenticate]);

  // Cold start.
  React.useEffect(() => {
    if (__DEV__) return;
    void evaluateLock();
  }, [evaluateLock]);

  // Background / foreground transitions with idle-timeout enforcement.
  React.useEffect(() => {
    if (__DEV__) return;
    const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;

      if (next === 'inactive' || next === 'background') {
        if (backgroundedAt.current === null) backgroundedAt.current = Date.now();
        return;
      }

      if (next === 'active' && (prev === 'inactive' || prev === 'background')) {
        const idleMs = backgroundedAt.current === null ? 0 : Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;

        const enabled = await readPref<boolean>(PrefKeys.deviceLockEnabled, false);
        if (!enabled) {
          setPhase('unlocked');
          return;
        }
        const minsRaw = await readPref<AutoLockMinutesPref>(
          PrefKeys.autoLockMinutes,
          DEFAULT_AUTO_LOCK_MINUTES,
        );
        const mins = isAutoLockMinutesPref(minsRaw) ? minsRaw : DEFAULT_AUTO_LOCK_MINUTES;
        // 0 = "Never" re-lock on resume (only the cold start locks).
        if (mins > 0 && idleMs >= mins * 60_000) {
          await evaluateLock();
        }
      }
    });
    return () => sub.remove();
  }, [evaluateLock]);

  if (phase === 'unlocked') return <>{children}</>;

  if (phase === 'checking') {
    // Neutral hold screen while we resolve the lock state — never the
    // protected content (this is what closes the flash-of-unlocked-UI race).
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

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: tokens.bg,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20,
        },
      ]}
    >
      <IconBrand size={64} color={tokens.accent} fill={tokens.accent} />
      <Text style={{ marginTop: 24, fontSize: 18, color: tokens.text, fontFamily: 'Manrope_700Bold' }}>
        App Locked
      </Text>
      <Text style={{ marginTop: 8, fontSize: 14, color: tokens.textDim, marginBottom: 32, textAlign: 'center' }}>
        Authenticate to access your logbook and sign entries.
      </Text>
      <Button variant="primary" full onPress={authenticate}>
        Unlock
      </Button>
    </View>
  );
}
