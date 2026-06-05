// Lazy event-notification facade. Hooks import this (cheap — no static native deps),
// and the heavy expo-notifications scheduler is dynamic-imported only when an event
// actually fires in the running app. That keeps expo-notifications entirely out of
// any node/jest import path, so hooks like use-remote-signing-sync stay testable.

import { Platform } from 'react-native';
import type { NotificationCategory } from './scheduler';

// Fire-and-forget. Safe to call from a React Query onSuccess; never throws.
export function notifyEvent(category: NotificationCategory, title: string, body: string): void {
  if (Platform.OS === 'web') return;
  void import('./scheduler')
    .then((m) => m.presentNow(category, title, body))
    .catch(() => {
      // best-effort; a missing/failed notifier must not affect the triggering action
    });
}
