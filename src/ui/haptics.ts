// App-wide haptic feedback wrapper.
//
// Haptics are a courtesy layer: every call is best-effort and never throws,
// and the whole thing is gated by a persisted on/off preference. The enabled
// flag is cached in module scope so a fire is synchronous — we never await
// AsyncStorage on the interaction path. loadHapticsPref() (app startup) and
// setHapticsEnabled() (the More toggle) keep that cache in sync.

import * as Haptics from 'expo-haptics';
import { PrefKeys, readPref, writePref } from '@/src/storage/local-prefs';

let enabled = true;

export function getHapticsEnabled(): boolean {
  return enabled;
}

// Update the in-memory flag and persist it. Called by the More -> Preferences
// toggle; persistence is best-effort via local-prefs.
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
  writePref(PrefKeys.hapticsEnabled, value);
}

// Hydrate the cache from storage once at app startup. Defaults to on.
export async function loadHapticsPref(): Promise<void> {
  enabled = await readPref<boolean>(PrefKeys.hapticsEnabled, true);
}

function fire(run: () => Promise<unknown>): void {
  if (!enabled) return;
  run().catch(() => {
    // Haptics are non-essential; swallow unsupported-platform / hardware errors.
  });
}

export const haptics = {
  // Light tick for discrete selection changes — chips, tabs, segmented controls.
  selection(): void {
    fire(() => Haptics.selectionAsync());
  },
  // Physical tap for button-like affordances.
  impact(strength: 'light' | 'medium' | 'heavy' = 'light'): void {
    const style =
      strength === 'heavy'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : strength === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;
    fire(() => Haptics.impactAsync(style));
  },
  // Something committed successfully — signed, saved, logged.
  success(): void {
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  // Caution moment — e.g. a destructive confirm is about to appear.
  warning(): void {
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  // An operation failed.
  error(): void {
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
};
