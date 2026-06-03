import {
  formatDate,
  formatDateOrDash,
  formatDateRange,
  formatTimestampDate,
  formatTimestampDateOrDash,
} from '@/src/domain/date-format';
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

  it('pins the test runner to UTC so zone-naive timestamp formatting is deterministic (P2-5 guard)', () => {
    // jest.config.js sets process.env.TZ='UTC'. The export builders call
    // formatTimestampDate with NO explicit zone, so they render in the runner's
    // ambient zone — if the TZ pin were a no-op, the export exact-match test
    // (signed_at 10:00Z) would shift a calendar day on a UTC+14/UTC-11 machine.
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC');
    expect(new Date().getTimezoneOffset()).toBe(0);
    // Ambient path (no explicit zone): both UTC-midnight-adjacent instants stay
    // on the 9th under UTC; they would shift under any non-UTC runner zone.
    expect(formatTimestampDate('2026-05-09T23:30:00.000Z')).toBe('05/09/2026');
    expect(formatTimestampDate('2026-05-09T00:30:00.000Z')).toBe('05/09/2026');
  });

  it('formats timestamp-bearing values in the given zone (P2-5)', () => {
    // 01:00 UTC is the previous evening in the Americas → previous calendar day.
    expect(formatTimestampDate('2026-05-09T01:00:00.000Z', 'America/New_York')).toBe('05/08/2026');
    // The same instant in a zone ahead of UTC stays on the 9th.
    expect(formatTimestampDate('2026-05-09T01:00:00.000Z', 'Asia/Kolkata')).toBe('05/09/2026');
    // The naive slice (formatDate) ignores the zone — this is the bug it replaces.
    expect(formatDate('2026-05-09T01:00:00.000Z')).toBe('05/09/2026');
    // Date-only values carry no instant, so they must never be zone-shifted.
    expect(formatTimestampDate('2026-05-09', 'America/New_York')).toBe('05/09/2026');
    // Blank / unparseable / dash fallbacks.
    expect(formatTimestampDate(null)).toBe('');
    expect(formatTimestampDate('not-a-date', 'America/New_York')).toBe('not-a-date');
    expect(formatTimestampDateOrDash(null)).toBe('-');
    expect(formatTimestampDateOrDash('2026-05-09T01:00:00.000Z', 'America/New_York')).toBe('05/08/2026');
  });
});
