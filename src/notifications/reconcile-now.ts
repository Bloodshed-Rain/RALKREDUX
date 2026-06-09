// Single source of reconcile truth. Reads the canonical SQLite state fresh
// (gear + active remote requests), reads prefs, runs the pure planner, and hands
// the desired set to the native scheduler. Called from the reconciler component
// (mount / data-change / foreground) and from the prefs screen (toggle / grant).
// App-only — imports the DB and the expo-notifications scheduler.

import { Platform } from 'react-native';
import { getClient } from '@/src/db/initialize';
import { createGearService } from '@/src/domain/gear/gear-service';
import { createLogbookService } from '@/src/domain/logbook/logbook-service';
import {
  DEFAULT_NOTIFICATION_PREFS,
  PrefKeys,
  isNotificationPrefs,
  readPref,
} from '@/src/storage/local-prefs';
import { buildScheduledNotifications } from './planner';
import { reconcile } from './scheduler';

let inFlight: Promise<void> | null = null;
let rerunRequested = false;

async function run(): Promise<void> {
  const db = getClient();
  const [gear, signingRequests, rawPrefs] = await Promise.all([
    createGearService(db).listGearItems(),
    createLogbookService(db).listActiveRemoteSignatureRequests(),
    readPref(PrefKeys.notificationPrefs, DEFAULT_NOTIFICATION_PREFS),
  ]);
  const prefs = isNotificationPrefs(rawPrefs) ? rawPrefs : DEFAULT_NOTIFICATION_PREFS;
  const planned = buildScheduledNotifications({
    gear,
    signingRequests,
    prefs,
    now: new Date(),
  });
  await reconcile(planned, prefs);
}

// Re-sync OS-scheduled notifications with current data + prefs. Best-effort and
// de-duplicated: overlapping calls coalesce onto the in-flight run, but a call that
// arrives mid-run sets a trailing flag so the latest committed state (a toggle, a
// completed/expired request) is reconciled exactly once after the current run drains —
// otherwise a change landing after the run's reads but before it resolves is lost
// until the next independent trigger (and a stale "expired" notice could misfire).
export async function reconcileNow(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (inFlight) {
    rerunRequested = true;
    return inFlight;
  }
  inFlight = run()
    .catch(() => {
      // best-effort; the next trigger retries
    })
    .finally(() => {
      inFlight = null;
      if (rerunRequested) {
        rerunRequested = false;
        void reconcileNow();
      }
    });
  return inFlight;
}
