import { buildScheduledNotifications, type PlannerInput } from '@/src/notifications/planner';
import type { GearItem, GearItemDetail, GearStatus } from '@/src/domain/gear/types';
import type { RemoteSignatureRequest } from '@/src/domain/logbook/types';
// Type-only import — pulling the runtime local-prefs module would drag in
// AsyncStorage (a native module that is null under jest). The planner is pure,
// so its test stays pure: we inline the default prefs.
import type { NotificationPrefs } from '@/src/storage/local-prefs';

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { gear: true, signing: true, backup: true };

// Fixed "now" — June 1 2026, local midnight. Jest pins TZ=UTC so local == UTC here.
const NOW = new Date(2026, 5, 1, 0, 0, 0);

function gearItem(over: Partial<GearItem> = {}): GearItem {
  return {
    id: 'g1',
    name: 'Petzl Avao',
    category: 'harness',
    manufacturer: null,
    model: null,
    serial_number: null,
    next_inspection_due: null,
    retired_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function gearDetail(status: GearStatus, over: Partial<GearItem> = {}): GearItemDetail {
  return { item: gearItem(over), latest_inspection: null, status };
}

function req(over: Partial<RemoteSignatureRequest> = {}): RemoteSignatureRequest {
  return {
    id: 'r1',
    entry_id: 'e1',
    recipient_name: 'Sam Lee',
    recipient_contact: null,
    verifier_role: null,
    verifier_company: null,
    status: 'pending',
    request_code: 'ABC123',
    entry_hash: 'h',
    hash_version: 5,
    expires_at: null,
    completed_signature_id: null,
    signing_token_hash: null,
    token_hint: null,
    viewed_at: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function build(over: Partial<PlannerInput> = {}) {
  return buildScheduledNotifications({
    gear: [],
    signingRequests: [],
    prefs: DEFAULT_NOTIFICATION_PREFS,
    now: NOW,
    fireHour: 7,
    ...over,
  });
}

const ids = (ns: ReturnType<typeof buildScheduledNotifications>) => ns.map((n) => n.id).sort();

describe('buildScheduledNotifications', () => {
  it('1. emits both lead tiers for an item due in 30 days', () => {
    const out = build({ gear: [gearDetail('due_soon', { next_inspection_due: '2026-07-01' })] });
    expect(ids(out)).toEqual(['gear-due-30:2026-07-01', 'gear-due-7:2026-07-01']);
  });

  it('2. emits only the 7-day tier when the 30-day lead is already past', () => {
    const out = build({ gear: [gearDetail('due_soon', { next_inspection_due: '2026-06-21' })] });
    expect(ids(out)).toEqual(['gear-due-7:2026-06-21']);
  });

  it('3. emits a single 7-day catch-up when both leads are past but the item is still pending', () => {
    const out = build({ gear: [gearDetail('due_soon', { next_inspection_due: '2026-06-04' })] });
    expect(ids(out)).toEqual(['gear-due-7:2026-06-04']);
    expect(out[0].trigger.kind).toBe('date');
  });

  it('4. coalesces two items due the same day into one notification with a count', () => {
    const out = build({
      gear: [
        gearDetail('due_soon', { id: 'a', name: 'Harness A', next_inspection_due: '2026-06-21' }),
        gearDetail('due_soon', { id: 'b', name: 'Harness B', next_inspection_due: '2026-06-21' }),
      ],
    });
    expect(ids(out)).toEqual(['gear-due-7:2026-06-21']);
    expect(out[0].data.count).toBe(2);
    expect(out[0].body).toMatch(/2 items/);
  });

  it('5. keeps items due on different days as distinct notifications', () => {
    const out = build({
      gear: [
        gearDetail('due_soon', { id: 'a', next_inspection_due: '2026-06-21' }),
        gearDetail('due_soon', { id: 'b', next_inspection_due: '2026-06-22' }),
      ],
    });
    expect(ids(out)).toEqual(['gear-due-7:2026-06-21', 'gear-due-7:2026-06-22']);
  });

  it('6. emits a weekly-repeating overdue notification on the due date weekday', () => {
    const out = build({ gear: [gearDetail('overdue', { id: 'g9', next_inspection_due: '2026-05-15' })] });
    expect(ids(out)).toEqual(['gear-overdue:g9']);
    const due = new Date(2026, 4, 15);
    expect(out[0].trigger).toEqual({ kind: 'weekly', weekday: due.getDay() + 1, hour: 7, minute: 0 });
  });

  it('7. stays silent for retired gear', () => {
    const out = build({ gear: [gearDetail('retired', { next_inspection_due: '2026-05-15' })] });
    expect(out).toEqual([]);
  });

  it('8. stays silent for unscheduled gear (no due date)', () => {
    const out = build({ gear: [gearDetail('unscheduled', { next_inspection_due: null })] });
    expect(out).toEqual([]);
  });

  it('9. honors per-category prefs', () => {
    const gear = [gearDetail('due_soon', { next_inspection_due: '2026-06-21' })];
    const signingRequests = [req({ expires_at: '2026-06-15T00:00:00.000Z' })];
    const gearOff: NotificationPrefs = { gear: false, signing: true, backup: true };
    const signingOff: NotificationPrefs = { gear: true, signing: false, backup: true };
    expect(ids(build({ gear, signingRequests, prefs: gearOff }))).toEqual(['signing-expired:ABC123']);
    expect(ids(build({ gear, signingRequests, prefs: signingOff }))).toEqual(['gear-due-7:2026-06-21']);
  });

  it('10. emits a date-triggered signing-expired for a pending request with a future expiry', () => {
    const out = build({ signingRequests: [req({ expires_at: '2026-06-15T09:00:00.000Z' })] });
    expect(ids(out)).toEqual(['signing-expired:ABC123']);
    expect(out[0].trigger).toEqual({ kind: 'date', at: Date.parse('2026-06-15T09:00:00.000Z') });
  });

  it('11. stays silent for already-expired or non-pending requests', () => {
    expect(build({ signingRequests: [req({ expires_at: '2026-05-01T00:00:00.000Z' })] })).toEqual([]);
    expect(build({ signingRequests: [req({ status: 'completed', expires_at: '2026-12-01T00:00:00.000Z' })] })).toEqual([]);
    expect(build({ signingRequests: [req({ expires_at: null })] })).toEqual([]);
  });

  it('12. builds the lead fire instant in LOCAL time at the fire hour, not UTC midnight', () => {
    const out = build({ gear: [gearDetail('due_soon', { next_inspection_due: '2026-07-01' })] });
    const lead30 = out.find((n) => n.id === 'gear-due-30:2026-07-01');
    expect(lead30).toBeTruthy();
    expect(lead30!.trigger.kind).toBe('date');
    const at = (lead30!.trigger as { kind: 'date'; at: number }).at;
    expect(at).toBe(new Date(2026, 6, 1 - 30, 7, 0, 0).getTime());
    expect(new Date(at).getHours()).toBe(7);
  });

  it('13. is deterministic — identical input yields an identical set', () => {
    const input: PlannerInput = {
      gear: [gearDetail('due_soon', { next_inspection_due: '2026-06-21' })],
      signingRequests: [req({ expires_at: '2026-06-15T00:00:00.000Z' })],
      prefs: DEFAULT_NOTIFICATION_PREFS,
      now: NOW,
      fireHour: 7,
    };
    expect(buildScheduledNotifications(input)).toEqual(buildScheduledNotifications(input));
  });

  it('14. returns nothing for empty inputs', () => {
    expect(build()).toEqual([]);
  });

  it('15. fires the catch-up on the due-date morning — a deterministic, not now-derived, instant', () => {
    // Regression guard: a now-derived catch-up `at` re-arms on every reconcile (spam).
    const out = build({ gear: [gearDetail('due_soon', { next_inspection_due: '2026-06-04' })] });
    const n = out.find((x) => x.id === 'gear-due-7:2026-06-04');
    expect(n).toBeTruthy();
    expect(n!.trigger).toEqual({ kind: 'date', at: new Date(2026, 5, 4, 7, 0, 0).getTime() });
  });

  it('16. emits no catch-up once the due-date morning has already passed', () => {
    const now = new Date(2026, 5, 4, 9, 0, 0); // June 4, 09:00 — past the 07:00 fire, due today
    const out = buildScheduledNotifications({
      gear: [gearDetail('due_soon', { next_inspection_due: '2026-06-04' })],
      signingRequests: [],
      prefs: DEFAULT_NOTIFICATION_PREFS,
      now,
      fireHour: 7,
    });
    expect(out).toEqual([]);
  });

  it('17. skips gear with a calendar-invalid due date', () => {
    const out = build({ gear: [gearDetail('due_soon', { next_inspection_due: '2026-13-45' })] });
    expect(out).toEqual([]);
  });
});
