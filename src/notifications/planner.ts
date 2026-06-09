// Pure notification PLANNER. No expo / react-native / DbClient imports — this is
// the testable core (runs under jest/better-sqlite3). It maps the current gear
// inventory + active remote-signing requests + prefs into the *desired* set of
// OS-scheduled local notifications. The native scheduler reconciles the OS state
// against this list (see ../notifications/scheduler.ts). Event-driven notifications
// (signing-completed, backup-failed) are NOT produced here — their fire date is
// unknown ahead of time; they are presented immediately at detection.

import type { GearItemDetail } from '@/src/domain/gear/types';
import type { RemoteSignatureRequest } from '@/src/domain/logbook/types';
import type { NotificationPrefs } from '@/src/storage/local-prefs';

// Abstract trigger descriptor. The planner must not import expo-notifications, so
// it emits this; scheduler.ts translates it into a SchedulableTriggerInput.
export type PlannedTrigger =
  | { kind: 'date'; at: number } // epoch ms — fire once at this instant
  | { kind: 'weekly'; weekday: number; hour: number; minute: number }; // weekday 1-7 (1=Sun)

export interface PlannedNotification {
  id: string; // stable + idempotent — re-scheduling the same id REPLACES (no dup)
  category: 'gear' | 'signing';
  trigger: PlannedTrigger;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export interface PlannerInput {
  gear: GearItemDetail[];
  signingRequests: RemoteSignatureRequest[];
  prefs: NotificationPrefs;
  now: Date;
  fireHour?: number; // local hour-of-day for date reminders; default 07:00
}

// Lead-time reminders before an inspection due date. Two tiers: 30 days (aligns
// with the app's existing due_soon flip) and 7 days. Kept to two so a full
// inventory stays well under iOS's ~64 pending-notification cap.
const LEAD_TIERS: readonly number[] = [30, 7];
const DEFAULT_FIRE_HOUR = 7;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Pull the YYYY-MM-DD calendar components out of a stored date string. We want the
// calendar day the tech recorded, not a timezone-shifted instant — never run the
// raw string through Date.parse (that reads "2026-07-01" as UTC midnight). Rejects
// calendar-impossible values (e.g. "2026-13-45", "2026-02-30") so a corrupt/imported
// row can't produce an "undefined"-month body or a silently month-rolled fire date.
function parseYmd(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(y, m - 1, d);
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) {
    return null;
  }
  return { y, m, d };
}

// LOCAL-time instant for a calendar day at a given hour. new Date(y, m-1, d, h) is
// local; this is the load-bearing fix for the UTC-midnight trap (07:00 local, not 00:00Z).
function localInstant(y: number, m: number, d: number, hour: number): number {
  return new Date(y, m - 1, d, hour, 0, 0, 0).getTime();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDue(y: number, m: number, d: number): string {
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

interface LeadGroup {
  offset: number;
  at: number;
  dueStr: string;
  dueLabel: string;
  names: string[];
}

export function buildScheduledNotifications(input: PlannerInput): PlannedNotification[] {
  const fireHour = input.fireHour ?? DEFAULT_FIRE_HOUR;
  const nowMs = input.now.getTime();
  const out: PlannedNotification[] = [];

  if (input.prefs.gear) {
    // Lead reminders are coalesced per (tier, due-day) so a fleet of gear all due
    // the same day produces one notification, not dozens.
    const leadGroups = new Map<string, LeadGroup>();

    for (const detail of input.gear) {
      const { item, status } = detail;
      if (status === 'retired' || status === 'unscheduled') continue;
      if (!item.next_inspection_due) continue;
      const ymd = parseYmd(item.next_inspection_due);
      if (!ymd) continue;
      const dueStr = `${ymd.y}-${pad2(ymd.m)}-${pad2(ymd.d)}`;
      const dueLabel = formatDue(ymd.y, ymd.m, ymd.d);

      if (status === 'overdue') {
        // Repeat weekly until the item is inspected or retired (reconcile cancels it then).
        const weekday = new Date(ymd.y, ymd.m - 1, ymd.d).getDay() + 1;
        out.push({
          id: `gear-overdue:${item.id}`,
          category: 'gear',
          trigger: { kind: 'weekly', weekday, hour: fireHour, minute: 0 },
          title: 'Inspection overdue',
          body: `${item.name} was due for inspection on ${dueLabel}. It is now overdue in your logbook. Log an inspection or retire the item.`,
          data: { kind: 'gear-overdue', gearId: item.id },
        });
        continue;
      }

      const addLead = (tier: number, at: number) => {
        const key = `${tier}|${dueStr}`;
        let group = leadGroups.get(key);
        if (!group) {
          group = { offset: tier, at, dueStr, dueLabel, names: [] };
          leadGroups.set(key, group);
        }
        group.names.push(item.name);
      };

      // Non-overdue with a due date. Schedule every lead tier still in the future.
      const futureTiers = LEAD_TIERS.filter(
        (tier) => localInstant(ymd.y, ymd.m, ymd.d - tier, fireHour) > nowMs,
      );
      if (futureTiers.length > 0) {
        for (const tier of futureTiers) {
          addLead(tier, localInstant(ymd.y, ymd.m, ymd.d - tier, fireHour));
        }
      } else {
        // Late entry (already inside the smallest lead window): one catch-up on the
        // due-date morning. The instant is derived from the DUE DATE, not from `now`,
        // so a given due day always yields the same `at` — it fires once and is never
        // re-armed with a fresh future date on the next reconcile. Skipped if that
        // morning has already passed (the item will surface via the overdue path).
        const at = localInstant(ymd.y, ymd.m, ymd.d, fireHour);
        if (at > nowMs) addLead(Math.min(...LEAD_TIERS), at);
      }
    }

    for (const group of leadGroups.values()) {
      const count = group.names.length;
      const soon = group.offset === 30;
      let body: string;
      if (count > 1) {
        body = `${count} items are due for inspection on ${group.dueLabel}.`;
      } else if (soon) {
        body = `${group.names[0]} is due for inspection on ${group.dueLabel}.`;
      } else {
        body = `${group.names[0]} is due for inspection on ${group.dueLabel}. Record the inspection when complete.`;
      }
      out.push({
        id: `gear-due-${group.offset}:${group.dueStr}`,
        category: 'gear',
        trigger: { kind: 'date', at: group.at },
        title: soon ? 'Inspections due soon' : 'Inspection due this week',
        body,
        data: { kind: 'gear-due', offset: group.offset, dueDate: group.dueStr, count },
      });
    }
  }

  if (input.prefs.signing) {
    for (const request of input.signingRequests) {
      if (request.status !== 'pending') continue;
      if (!request.expires_at) continue;
      const at = Date.parse(request.expires_at);
      if (!Number.isFinite(at) || at <= nowMs) continue;
      out.push({
        id: `signing-expired:${request.request_code}`,
        category: 'signing',
        trigger: { kind: 'date', at },
        title: 'Signature request expired',
        body: `Your signature request to ${request.recipient_name} expired before it was signed. The entry is still a draft — send a new request when ready.`,
        data: { kind: 'signing-expired', requestCode: request.request_code },
      });
    }
  }

  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return out;
}
