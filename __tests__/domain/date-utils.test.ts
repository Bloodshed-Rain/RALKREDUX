import {
  calendarDateToIso,
  daysFromTodayIso,
  formatIsoForDisplay,
  isoToLocalDate,
  todayLocalIsoDate,
} from '@/src/domain/date-utils';

describe('daysFromTodayIso', () => {
  const now = new Date(2026, 4, 13); // 2026-05-13 local

  it('returns 0 for today', () => {
    expect(daysFromTodayIso('2026-05-13', now)).toBe(0);
  });

  it('returns negative for past dates', () => {
    expect(daysFromTodayIso('2026-05-12', now)).toBe(-1);
    expect(daysFromTodayIso('2026-04-13', now)).toBe(-30);
  });

  it('returns positive for future dates', () => {
    expect(daysFromTodayIso('2026-05-14', now)).toBe(1);
    expect(daysFromTodayIso('2026-06-12', now)).toBe(30);
    expect(daysFromTodayIso('2027-05-13', now)).toBe(365);
  });

  it('returns null for null / undefined / unparseable input', () => {
    expect(daysFromTodayIso(null, now)).toBeNull();
    expect(daysFromTodayIso(undefined, now)).toBeNull();
    expect(daysFromTodayIso('', now)).toBeNull();
    expect(daysFromTodayIso('not-a-date', now)).toBeNull();
    expect(daysFromTodayIso('2026/05/13', now)).toBeNull();
  });

  it('handles month/year boundaries', () => {
    expect(daysFromTodayIso('2026-04-30', new Date(2026, 4, 1))).toBe(-1);
    expect(daysFromTodayIso('2025-12-31', new Date(2026, 0, 1))).toBe(-1);
  });
});

describe('calendarDateToIso', () => {
  it('serializes the LOCAL calendar day, never the UTC day', () => {
    // Constructed from local parts; read back as local parts. In any timezone
    // east of UTC, toISOString().slice(0,10) would roll to 2027-01-01 — this
    // helper must stay on the local day.
    const localNye = new Date(2026, 11, 31, 23, 30, 0);
    expect(calendarDateToIso(localNye)).toBe('2026-12-31');
  });

  it('agrees with todayLocalIsoDate for the same instant', () => {
    const now = new Date(2026, 0, 1, 23, 55, 0);
    expect(calendarDateToIso(now)).toBe(todayLocalIsoDate(now));
  });
});

describe('isoToLocalDate', () => {
  it('parses YYYY-MM-DD to a local midnight Date round-tripping calendarDateToIso', () => {
    const d = isoToLocalDate('2026-05-24');
    expect(d).not.toBeNull();
    expect(calendarDateToIso(d as Date)).toBe('2026-05-24');
    expect((d as Date).getFullYear()).toBe(2026);
    expect((d as Date).getMonth()).toBe(4);
    expect((d as Date).getDate()).toBe(24);
  });

  it('returns null for blank/invalid input', () => {
    expect(isoToLocalDate(null)).toBeNull();
    expect(isoToLocalDate('not-a-date')).toBeNull();
  });
});

describe('formatIsoForDisplay', () => {
  it('formats ISO to a human day', () => {
    expect(formatIsoForDisplay('2026-05-24')).toBe('24 May 2026');
  });
  it('passes through null/garbage gracefully', () => {
    expect(formatIsoForDisplay(null)).toBeNull();
    expect(formatIsoForDisplay('garbage')).toBe('garbage');
  });
});
