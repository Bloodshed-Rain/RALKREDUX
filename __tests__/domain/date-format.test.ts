import { formatDate, formatDateOrDash, formatDateRange } from '@/src/domain/date-format';
import { isExpiredAt, isValidIsoDateRange, todayLocalIsoDate } from '@/src/domain/date-utils';

describe('date display and validation helpers', () => {
  it('formats app-facing dates as MM/DD/YYYY', () => {
    expect(formatDate('2026-05-09')).toBe('05/09/2026');
    expect(formatDate('2026-05-09T18:30:00.000Z')).toBe('05/09/2026');
    expect(formatDate('not-a-date')).toBe('not-a-date');
    expect(formatDateOrDash(null)).toBe('-');
  });

  it('formats date ranges without duplicating same-day records', () => {
    expect(formatDateRange('2026-05-09', '2026-05-09')).toBe('05/09/2026');
    expect(formatDateRange('2026-05-09', '2026-05-10')).toBe('05/09/2026 to 05/10/2026');
    expect(formatDateRange(null, null)).toBe('-');
  });

  it('validates ISO date ranges and parsed expiry times', () => {
    expect(isValidIsoDateRange('2026-05-09', '2026-05-10')).toBe(true);
    expect(isValidIsoDateRange('2026-05-10', '2026-05-09')).toBe(false);
    expect(isValidIsoDateRange('05/09/2026', '2026-05-10')).toBe(false);
    expect(isExpiredAt('2026-05-09T09:00:00-05:00', '2026-05-09T15:00:00.000Z')).toBe(true);
    expect(isExpiredAt('2026-05-09T12:00:00-05:00', '2026-05-09T15:00:00.000Z')).toBe(false);
    expect(isExpiredAt('not-a-date', '2026-05-09T15:00:00.000Z')).toBe(true);
    expect(isExpiredAt(null, '2026-05-09T15:00:00.000Z')).toBe(false);
  });

  it('builds local date defaults from the local calendar fields', () => {
    expect(todayLocalIsoDate(new Date(2026, 4, 9, 23, 30))).toBe('2026-05-09');
  });
});
