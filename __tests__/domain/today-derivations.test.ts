import {
  applyCertRatio,
  buildActions,
  buildAdvisories,
  buildOpenWork,
  certTarget,
  computeDayOf365,
  distinctOpDaysLast30,
  isSignedToday,
  signedHoursLast30Days,
  splitDecimal,
} from '@/src/domain/logbook/today-derivations';
import type { LogbookEntry, DashboardSummary, ExpirationAlert } from '@/src/domain/logbook/types';
import type { GearItemDetail } from '@/src/domain/gear/types';

function entry(overrides: Partial<LogbookEntry> = {}): LogbookEntry {
  return {
    id: 'e1',
    date_from: '2026-05-09',
    date_to: '2026-05-09',
    employer: 'Northwind',
    site: 'Bridge 12',
    client: 'City Works',
    description: 'Inspection',
    work_hours: 8,
    work_task: 'Inspection',
    access_method: 'Two-rope',
    structure_type: 'Bridge',
    max_height: 120,
    height_unit: 'ft',
    sprat_level_snapshot: 'II',
    irata_level_snapshot: null,
    status: 'signed',
    amends_entry_id: null,
    pending_signature_id: null,
    created_at: '2026-05-09T08:00:00.000Z',
    updated_at: '2026-05-09T18:00:00.000Z',
    ...overrides,
  };
}

function gearDetail(overrides: Partial<GearItemDetail['item']> = {}, status: GearItemDetail['status'] = 'overdue'): GearItemDetail {
  return {
    item: {
      id: 'g1',
      name: 'BEAL STATIC 10.5',
      category: 'rope',
      manufacturer: 'Beal',
      model: 'Static 10.5',
      serial_number: 'R-001',
      next_inspection_due: '2026-05-01',
      retired_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      ...overrides,
    },
    latest_inspection: null,
    status,
  };
}

describe('computeDayOf365', () => {
  it('returns day 1 on the creation day', () => {
    expect(computeDayOf365('2026-05-12T00:00:00.000Z', new Date('2026-05-12T08:00:00.000Z'))).toBe(1);
  });

  it('returns day 130 after 129 days elapsed', () => {
    const today = new Date('2026-05-12T00:00:00.000Z');
    const created = new Date(today.getTime() - 129 * 86_400_000).toISOString();
    expect(computeDayOf365(created, today)).toBe(130);
  });

  it('rolls over after a full year', () => {
    const today = new Date('2026-05-12T00:00:00.000Z');
    const created = new Date(today.getTime() - 365 * 86_400_000).toISOString();
    expect(computeDayOf365(created, today)).toBe(1);
  });

  it('handles malformed timestamps defensively', () => {
    expect(computeDayOf365('not a date', new Date('2026-05-12T00:00:00.000Z'))).toBe(1);
  });
});

describe('splitDecimal', () => {
  it('splits a whole-and-tenths number', () => {
    expect(splitDecimal(612.5)).toEqual({ whole: '612', decimal: '5' });
  });

  it('returns zero-decimal for round numbers', () => {
    expect(splitDecimal(8)).toEqual({ whole: '8', decimal: '0' });
  });

  it('handles NaN defensively', () => {
    expect(splitDecimal(Number.NaN)).toEqual({ whole: '0', decimal: '0' });
  });
});

describe('signedHoursLast30Days and distinctOpDaysLast30', () => {
  const today = new Date('2026-05-12T12:00:00.000Z');

  it('sums signed-status hours within the last 30 days', () => {
    const entries = [
      entry({ id: 'a', date_to: '2026-05-10', work_hours: 8, status: 'signed' }),
      entry({ id: 'b', date_to: '2026-05-05', work_hours: 6, status: 'signed' }),
      entry({ id: 'c', date_to: '2026-05-01', work_hours: 4, status: 'amended' }),
    ];
    expect(signedHoursLast30Days(entries, today)).toBeCloseTo(18, 5);
  });

  it('excludes drafts from signed hours', () => {
    const entries = [
      entry({ id: 'a', date_to: '2026-05-10', work_hours: 8, status: 'draft' }),
      entry({ id: 'b', date_to: '2026-05-05', work_hours: 6, status: 'signed' }),
    ];
    expect(signedHoursLast30Days(entries, today)).toBeCloseTo(6, 5);
  });

  it('excludes entries older than 30 days', () => {
    const entries = [
      entry({ id: 'a', date_to: '2026-03-01', work_hours: 8, status: 'signed' }),
      entry({ id: 'b', date_to: '2026-05-10', work_hours: 6, status: 'signed' }),
    ];
    expect(signedHoursLast30Days(entries, today)).toBeCloseTo(6, 5);
  });

  it('counts distinct op days inside the window', () => {
    const entries = [
      entry({ id: 'a', date_to: '2026-05-10', status: 'signed' }),
      entry({ id: 'b', date_to: '2026-05-10', status: 'signed' }), // same day
      entry({ id: 'c', date_to: '2026-05-08', status: 'signed' }),
      entry({ id: 'd', date_to: '2026-03-01', status: 'signed' }), // outside window
    ];
    expect(distinctOpDaysLast30(entries, today)).toBe(2);
  });
});

describe('isSignedToday', () => {
  it('matches a signed entry updated today', () => {
    const today = new Date('2026-05-12T18:00:00');
    const todayLocalIso = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14).toISOString();
    expect(isSignedToday(entry({ status: 'signed', updated_at: todayLocalIso }), today)).toBe(true);
  });

  it('rejects a signed entry from yesterday', () => {
    const today = new Date('2026-05-12T08:00:00');
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 14).toISOString();
    expect(isSignedToday(entry({ status: 'signed', updated_at: yesterday }), today)).toBe(false);
  });

  it('rejects a draft entry even if updated today', () => {
    const today = new Date('2026-05-12T18:00:00');
    const todayIso = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14).toISOString();
    expect(isSignedToday(entry({ status: 'draft', updated_at: todayIso }), today)).toBe(false);
  });
});

describe('certTarget and applyCertRatio', () => {
  it('returns null when no level is set', () => {
    expect(certTarget('sprat', null)).toBeNull();
  });

  it('reports SPRAT I → II with the 500-hour target', () => {
    const p = certTarget('sprat', 'I')!;
    expect(p.target).toBe(500);
    expect(p.targetLabel).toBe('I → II');
  });

  it('reports SPRAT III as terminal (level III with 1000-hour target)', () => {
    const p = certTarget('sprat', 'III')!;
    expect(p.targetLabel).toBe('III → III');
    expect(p.target).toBe(1000);
  });

  it('clamps the ratio to [0,1]', () => {
    const base = certTarget('irata', 'II')!;
    expect(applyCertRatio(base, 0).ratio).toBe(0);
    expect(applyCertRatio(base, 500).ratio).toBeCloseTo(0.5, 3);
    expect(applyCertRatio(base, 99_999).ratio).toBe(1);
  });
});

describe('buildAdvisories', () => {
  const today = new Date('2026-05-12T00:00:00.000Z');

  it('returns nothing when state is clean', () => {
    expect(buildAdvisories({ gear: [], expiringCerts: [], today })).toEqual([]);
  });

  it('produces a P1 red advisory for overdue gear, undismissable', () => {
    const advisories = buildAdvisories({
      gear: [gearDetail({ name: 'BEAL STATIC 10.5', serial_number: 'R-001', next_inspection_due: '2026-05-01' })],
      expiringCerts: [],
      today,
    });
    expect(advisories).toHaveLength(1);
    expect(advisories[0]).toMatchObject({
      priority: 'P1',
      tone: 'red',
      dismissible: false,
    });
    expect(advisories[0].detail).toContain('R-001');
    expect(advisories[0].detail).toContain('DO NOT DEPLOY');
  });

  it('produces a P2 yellow advisory for due-soon gear', () => {
    const advisories = buildAdvisories({
      gear: [gearDetail({ next_inspection_due: '2026-05-25' }, 'due_soon')],
      expiringCerts: [],
      today,
    });
    expect(advisories[0]).toMatchObject({ priority: 'P2', tone: 'yellow', dismissible: true });
  });

  it('sorts P1 before P2 when both are present', () => {
    const advisories = buildAdvisories({
      gear: [
        gearDetail({ id: 'g-due', next_inspection_due: '2026-05-25' }, 'due_soon'),
        gearDetail({ id: 'g-overdue', next_inspection_due: '2026-05-01' }, 'overdue'),
      ],
      expiringCerts: [],
      today,
    });
    expect(advisories.map((a) => a.priority)).toEqual(['P1', 'P2']);
  });

  it('flags an expired cert as P1', () => {
    const cert: ExpirationAlert = { label: 'SPRAT certification', value: '2026-05-01', severity: 'expired', daysRemaining: -11 };
    const advisories = buildAdvisories({ gear: [], expiringCerts: [cert], today });
    expect(advisories[0]).toMatchObject({ priority: 'P1', tone: 'red', dismissible: false });
    expect(advisories[0].title).toContain('expired');
  });

  it('flags a warning-soon cert as P3 yellow', () => {
    const cert: ExpirationAlert = { label: 'IRATA certification', value: '2026-06-01', severity: 'warning', daysRemaining: 20 };
    const advisories = buildAdvisories({ gear: [], expiringCerts: [cert], today });
    expect(advisories[0]).toMatchObject({ priority: 'P3', tone: 'yellow' });
  });

  it('flags a warning-far cert as P4 ink', () => {
    const cert: ExpirationAlert = { label: 'IRATA certification', value: '2026-07-30', severity: 'warning', daysRemaining: 79 };
    const advisories = buildAdvisories({ gear: [], expiringCerts: [cert], today });
    expect(advisories[0]).toMatchObject({ priority: 'P4', tone: 'ink' });
  });
});

describe('buildActions', () => {
  const baseSummary: DashboardSummary = {
    totalEntries: 0,
    draftEntries: 0,
    signedEntries: 0,
    amendedEntries: 0,
    pendingSignatureRequests: 0,
    draftHours: 0,
    signedHours: 0,
    expiringCerts: [],
    overdueGearItems: 0,
    dueSoonGearItems: 0,
  };

  it('always emits Open new record first with emphasis', () => {
    const actions = buildActions({ summary: baseSummary, overdueGearItems: 0, dueSoonGearItems: 0 });
    expect(actions[0]).toMatchObject({ id: 'new-record', emphasis: true, route: '/entry/new' });
  });

  it('adds Countersign only when pending > 0', () => {
    const actions = buildActions({
      summary: { ...baseSummary, pendingSignatureRequests: 2 },
      overdueGearItems: 0,
      dueSoonGearItems: 0,
    });
    expect(actions.map((a) => a.id)).toContain('countersign');
    expect(actions.find((a) => a.id === 'countersign')?.label).toBe('Countersign 2 pending');
  });

  it('adds Inspect when overdue or due-soon gear > 0', () => {
    const actions = buildActions({
      summary: baseSummary,
      overdueGearItems: 1,
      dueSoonGearItems: 1,
    });
    expect(actions.find((a) => a.id === 'inspect-gear')?.label).toBe('Inspect 2 items');
  });

  it('adds Finish drafts when drafts > 0', () => {
    const actions = buildActions({
      summary: { ...baseSummary, draftEntries: 3 },
      overdueGearItems: 0,
      dueSoonGearItems: 0,
    });
    expect(actions.find((a) => a.id === 'finish-drafts')?.label).toBe('Finish 3 drafts');
  });

  it('returns only the new-record action when nothing else is pending', () => {
    const actions = buildActions({ summary: baseSummary, overdueGearItems: 0, dueSoonGearItems: 0 });
    expect(actions).toHaveLength(1);
  });
});

describe('buildOpenWork', () => {
  it('returns nothing when there is no open work', () => {
    expect(
      buildOpenWork({ openDrafts: 0, awaitingSignature: 0, overdueGear: 0, dueSoonGear: 0 }),
    ).toEqual([]);
  });

  it('suppresses zero-count categories', () => {
    const items = buildOpenWork({ openDrafts: 2, awaitingSignature: 0, overdueGear: 0, dueSoonGear: 0 });
    expect(items.map((i) => i.id)).toEqual(['open-drafts']);
    expect(items[0].tone).toBe('warn');
    expect(items[0].route).toBe('/records?filter=drafts');
  });

  it('orders overdue gear first (danger) ahead of the warn items', () => {
    const items = buildOpenWork({ openDrafts: 1, awaitingSignature: 1, overdueGear: 1, dueSoonGear: 1 });
    expect(items.map((i) => i.id)).toEqual([
      'gear-overdue',
      'awaiting-signature',
      'open-drafts',
      'gear-due-soon',
    ]);
    expect(items[0].tone).toBe('danger');
  });

  it('pluralizes labels by count', () => {
    expect(
      buildOpenWork({ openDrafts: 1, awaitingSignature: 0, overdueGear: 0, dueSoonGear: 0 })[0].label,
    ).toBe('1 draft to finish');
    expect(
      buildOpenWork({ openDrafts: 3, awaitingSignature: 0, overdueGear: 0, dueSoonGear: 0 })[0].label,
    ).toBe('3 drafts to finish');
  });
});
