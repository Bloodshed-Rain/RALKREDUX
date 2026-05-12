import {
  computeRangeKpis,
  filterEntriesInRange,
  getEntryListStatus,
  RANGE_OPTIONS,
  shortStatus,
  type RangeKey,
} from '@/src/domain/logbook/records-derivations';
import type { LogbookEntry } from '@/src/domain/logbook/types';

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

describe('RANGE_OPTIONS', () => {
  it('exposes the spec\'s five window labels in the documented order', () => {
    expect(RANGE_OPTIONS.map((opt) => opt.key)).toEqual(['7D', '30D', '90D', 'YTD', 'ALL']);
  });
});

describe('filterEntriesInRange', () => {
  const today = new Date('2026-05-12T12:00:00.000Z');

  it('returns everything for ALL', () => {
    const entries = [
      entry({ id: 'a', date_to: '2025-12-31' }),
      entry({ id: 'b', date_to: '2026-05-10' }),
    ];
    expect(filterEntriesInRange(entries, today, 'ALL')).toHaveLength(2);
  });

  it('keeps only the last 7 days for 7D', () => {
    const entries = [
      entry({ id: 'a', date_to: '2026-05-12' }),
      entry({ id: 'b', date_to: '2026-05-06' }),
      entry({ id: 'c', date_to: '2026-05-04' }),
    ];
    const result = filterEntriesInRange(entries, today, '7D');
    expect(result.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('keeps only entries from current year for YTD', () => {
    const entries = [
      entry({ id: 'a', date_to: '2025-12-31' }),
      entry({ id: 'b', date_to: '2026-01-01' }),
      entry({ id: 'c', date_to: '2026-05-10' }),
    ];
    const result = filterEntriesInRange(entries, today, 'YTD');
    expect(result.map((e) => e.id)).toEqual(['b', 'c']);
  });

  it('returns an empty list when nothing falls within the window', () => {
    const entries = [entry({ id: 'a', date_to: '2025-01-01' })];
    expect(filterEntriesInRange(entries, today, '30D')).toEqual([]);
  });
});

describe('computeRangeKpis', () => {
  it('sums work hours and counts distinct work-days + entries', () => {
    const entries = [
      entry({ id: 'a', date_to: '2026-05-10', work_hours: 8 }),
      entry({ id: 'b', date_to: '2026-05-10', work_hours: 4 }),
      entry({ id: 'c', date_to: '2026-05-09', work_hours: 6 }),
    ];
    const kpis = computeRangeKpis(entries);
    expect(kpis.totalHours).toBe(18);
    expect(kpis.daysOnRope).toBe(2);
    expect(kpis.entryCount).toBe(3);
  });

  it('returns zeros for an empty list', () => {
    expect(computeRangeKpis([])).toEqual({ totalHours: 0, daysOnRope: 0, entryCount: 0 });
  });
});

describe('getEntryListStatus', () => {
  it('returns SIGNED for signed entries', () => {
    expect(getEntryListStatus(entry({ status: 'signed' }))).toBe('SIGNED');
  });

  it('returns AMENDED for amended entries (takes precedence over signature presence)', () => {
    expect(getEntryListStatus(entry({ status: 'amended' }))).toBe('AMENDED');
  });

  it('returns PENDING for a draft with a pending signature request', () => {
    expect(
      getEntryListStatus(entry({ status: 'draft', pending_signature_id: 'req_1' })),
    ).toBe('PENDING');
  });

  it('returns DRAFT for a vanilla draft', () => {
    expect(getEntryListStatus(entry({ status: 'draft', pending_signature_id: null }))).toBe('DRAFT');
  });
});

describe('shortStatus', () => {
  it('maps to the prototype\'s 3-letter codes', () => {
    expect(shortStatus('SIGNED')).toBe('OK');
    expect(shortStatus('PENDING')).toBe('PEN');
    expect(shortStatus('DRAFT')).toBe('DRF');
    expect(shortStatus('AMENDED')).toBe('AMD');
  });
});
