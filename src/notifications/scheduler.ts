// The ONLY module that imports expo-notifications. Native adapter: it owns the
// notification handler, Android channels, permission flow, the reconcile loop that
// makes the OS schedule match the planner's desired set, and immediate (event-driven)
// presentation. Every export is web/permission guarded and best-effort — a failure
// here must never break boot or a user action. App-only (never loaded in node tests;
// event fires route through ./notify, which lazy-imports this).

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import {
  DEFAULT_NOTIFICATION_PREFS,
  PrefKeys,
  isNotificationPrefs,
  readPref,
  type NotificationPrefs,
} from '@/src/storage/local-prefs';
import type { PlannedNotification, PlannedTrigger } from './planner';

export type NotificationCategory = 'gear' | 'signing' | 'backup';

export interface PermissionState {
  granted: boolean;
  canAskAgain: boolean;
}

const CHANNELS: Record<NotificationCategory, { id: string; name: string }> = {
  gear: { id: 'gear', name: 'Gear inspections' },
  signing: { id: 'signing', name: 'Remote signing' },
  backup: { id: 'backup', name: 'Backup & sync' },
};

// Our scheduled-id namespace. reconcile only ever reads/cancels ids with these
// prefixes, so notifications scheduled by anything else are never disturbed.
// (Event-driven `presentNow` notifications carry no id and are never reconciled.)
const OUR_PREFIXES = ['gear-', 'signing-'];

const isWeb = Platform.OS === 'web';

let didSetup = false;

// Register the foreground handler + Android channels exactly once. Channels must
// exist BEFORE POST_NOTIFICATIONS is requested on Android 13+, so this runs at boot.
export async function ensureSetup(): Promise<void> {
  if (isWeb || didSetup) return;
  didSetup = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await Promise.all(
        Object.values(CHANNELS).map((c) =>
          Notifications.setNotificationChannelAsync(c.id, {
            name: c.name,
            importance: Notifications.AndroidImportance.HIGH,
          }),
        ),
      );
    }
  } catch {
    didSetup = false; // allow a later retry
  }
}

export async function getPermission(): Promise<PermissionState> {
  if (isWeb) return { granted: false, canAskAgain: false };
  try {
    const p = await Notifications.getPermissionsAsync();
    return { granted: p.granted, canAskAgain: p.canAskAgain };
  } catch {
    return { granted: false, canAskAgain: false };
  }
}

export async function requestPermission(): Promise<PermissionState> {
  if (isWeb) return { granted: false, canAskAgain: false };
  try {
    await ensureSetup(); // channel-before-prompt (Android 13+)
    const p = await Notifications.requestPermissionsAsync();
    return { granted: p.granted, canAskAgain: p.canAskAgain };
  } catch {
    return { granted: false, canAskAgain: false };
  }
}

function triggerToInput(trigger: PlannedTrigger, channelId: string): Notifications.NotificationTriggerInput {
  if (trigger.kind === 'weekly') {
    return {
      type: SchedulableTriggerInputTypes.WEEKLY,
      weekday: trigger.weekday,
      hour: trigger.hour,
      minute: trigger.minute,
      channelId,
    };
  }
  return { type: SchedulableTriggerInputTypes.DATE, date: new Date(trigger.at), channelId };
}

async function cancelOurScheduled(): Promise<void> {
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const r of existing) {
    if (OUR_PREFIXES.some((pfx) => r.identifier.startsWith(pfx))) {
      await Notifications.cancelScheduledNotificationAsync(r.identifier);
    }
  }
}

// Make the OS scheduled set equal `planned` (filtered by prefs). Idempotent:
// re-scheduling an existing identifier REPLACES it, and only our-prefixed ids are
// ever cancelled. With permission off, we clear our notifications and stop.
export async function reconcile(planned: PlannedNotification[], prefs: NotificationPrefs): Promise<void> {
  if (isWeb) return;
  try {
    await ensureSetup();
    const perm = await getPermission();
    if (!perm.granted) {
      await cancelOurScheduled();
      return;
    }
    const desired = planned.filter((p) => prefs[p.category]);
    const desiredIds = new Set(desired.map((d) => d.id));
    const existing = (await Notifications.getAllScheduledNotificationsAsync()).filter((r) =>
      OUR_PREFIXES.some((pfx) => r.identifier.startsWith(pfx)),
    );
    for (const d of desired) {
      await Notifications.scheduleNotificationAsync({
        identifier: d.id,
        content: { title: d.title, body: d.body, data: d.data, sound: 'default' },
        trigger: triggerToInput(d.trigger, CHANNELS[d.category].id),
      });
    }
    for (const r of existing) {
      if (!desiredIds.has(r.identifier)) {
        await Notifications.cancelScheduledNotificationAsync(r.identifier);
      }
    }
  } catch {
    // best-effort; a transient failure self-heals on the next reconcile
  }
}

// Immediate, event-driven notification (signing-completed, backup-failed). Gated on
// the category pref + OS permission. On Android the channel is carried on the trigger,
// so a bare `null` trigger would land on a generic fallback channel — a
// ChannelAwareTriggerInput (`{ channelId }`) still fires immediately but routes to the
// matching per-category channel. iOS has no channels, so `null` is the canonical immediate.
export async function presentNow(category: NotificationCategory, title: string, body: string): Promise<void> {
  if (isWeb) return;
  try {
    const raw = await readPref(PrefKeys.notificationPrefs, DEFAULT_NOTIFICATION_PREFS);
    const prefs = isNotificationPrefs(raw) ? raw : DEFAULT_NOTIFICATION_PREFS;
    if (!prefs[category]) return;
    const perm = await getPermission();
    if (!perm.granted) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: Platform.OS === 'android' ? { channelId: CHANNELS[category].id } : null,
    });
  } catch {
    // best-effort
  }
}

// DEV-ONLY (call sites gate on __DEV__): schedule a one-off test notification `seconds`
// from now, so the OS-scheduled delivery path — the part that can't be unit-tested and
// otherwise only fires at a real 07:00 deadline — can be verified on-device in seconds.
// Uses the same DATE-trigger shape as real lead reminders. No identifier, so the next
// reconcile (which only touches gear-/signing-prefixed ids) never cancels it.
export async function scheduleTestNotification(seconds: number): Promise<void> {
  if (isWeb) return;
  try {
    await ensureSetup();
    const perm = await getPermission();
    if (!perm.granted) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test · scheduled reminder',
        body: `Scheduled ${seconds}s ago. Seeing this from the lock screen confirms OS scheduling works.`,
        sound: 'default',
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + seconds * 1000),
        channelId: CHANNELS.gear.id,
      },
    });
  } catch {
    // best-effort
  }
}
