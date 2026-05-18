// Thin AsyncStorage-backed key/value store for local-only UI preferences.
//
// This is deliberately NOT a domain service and NOT backed by SQLite or
// Supabase: these are device-local conveniences (last-used range chip,
// advisory acknowledgements, default wizard action). Losing them is
// harmless, so every operation is best-effort and never throws.

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'ralb:pref:';

// Stable keys for everything stored through this helper.
export const PrefKeys = {
  advisoryAcks: 'advisory-acks',
  recordsRange: 'records-range',
  defaultTerminalAction: 'default-terminal-action',
  hapticsEnabled: 'haptics-enabled',
  onboardingSeen: 'onboarding-seen',
  deviceLockEnabled: 'device-lock-enabled',
  autoLockMinutes: 'auto-lock-minutes',
  biometricForSigning: 'biometric-for-signing',
} as const;

export type PrefKey = (typeof PrefKeys)[keyof typeof PrefKeys];

// Auto-lock idle timeout in minutes before the app re-prompts for unlock.
// 0 disables auto-lock (only locks on app cold-start when device lock is on).
export type AutoLockMinutesPref = 0 | 1 | 5 | 15 | 60;

export const AUTO_LOCK_OPTIONS: readonly AutoLockMinutesPref[] = [0, 1, 5, 15, 60] as const;

export const DEFAULT_AUTO_LOCK_MINUTES: AutoLockMinutesPref = 5;

export function isAutoLockMinutesPref(value: unknown): value is AutoLockMinutesPref {
  return value === 0 || value === 1 || value === 5 || value === 15 || value === 60;
}

// Which terminal action the new-entry wizard's Step 3 surfaces first / with
// primary emphasis. The other two stay reachable, just de-emphasized — this
// never skips the verify-and-submit step.
export type TerminalActionPref = 'sign' | 'request' | 'draft';

export const TERMINAL_ACTION_PREFS: readonly TerminalActionPref[] = [
  'sign',
  'request',
  'draft',
] as const;

export const DEFAULT_TERMINAL_ACTION: TerminalActionPref = 'sign';

export function isTerminalActionPref(value: unknown): value is TerminalActionPref {
  return value === 'sign' || value === 'request' || value === 'draft';
}

// Read a JSON-serialized preference, falling back on miss, parse error, or
// any storage failure.
export async function readPref<T>(key: PrefKey, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// Persist a preference. Best-effort: failures are swallowed.
export async function writePref<T>(key: PrefKey, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Preferences are non-critical; a failed write just means the default
    // is used next launch.
  }
}
