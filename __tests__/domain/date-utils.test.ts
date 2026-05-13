import { daysFromTodayIso } from '@/src/domain/date-utils';

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
