const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function todayLocalIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysIso(days: number, now = new Date()): string {
  const date = new Date(now.getTime());
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function parseTimestampMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function isExpiredAt(value: string | null | undefined, nowIso: string): boolean {
  if (!value) return false;
  const expiresMs = parseTimestampMs(value);
  const nowMs = parseTimestampMs(nowIso);
  return expiresMs === null || nowMs === null || expiresMs < nowMs;
}

export function compareIsoDates(dateFrom: string | null | undefined, dateTo: string | null | undefined): number | null {
  if (!dateFrom || !dateTo || !ISO_DATE_PATTERN.test(dateFrom) || !ISO_DATE_PATTERN.test(dateTo)) {
    return null;
  }
  return dateFrom.localeCompare(dateTo);
}

export function isValidIsoDateRange(dateFrom: string | null | undefined, dateTo: string | null | undefined): boolean {
  const comparison = compareIsoDates(dateFrom, dateTo);
  return comparison !== null && comparison <= 0;
}

/**
 * Days between today (local) and an ISO date. Negative = past, 0 = today,
 * positive = future. Returns null for missing or unparseable input.
 */
export function daysFromTodayIso(value: string | null | undefined, now = new Date()): number | null {
  if (!value || !ISO_DATE_PATTERN.test(value)) return null;
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;
  const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msPerDay = 86_400_000;
  return Math.round((target.getTime() - today.getTime()) / msPerDay);
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Serializes a Date to YYYY-MM-DD using LOCAL calendar parts — the day the user
// sees on the calendar. NEVER use toISOString(): it shifts across the UTC
// boundary and would freeze the wrong day into a signed entry.
export function calendarDateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parses YYYY-MM-DD into a LOCAL-midnight Date (so the calendar highlights the
// intended day regardless of timezone). Returns null for missing/invalid input.
export function isoToLocalDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const match = ISO_DATE_PATTERN.exec(iso);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

// Friendly display for a stored ISO date, e.g. '24 May 2026'. Parses the string
// parts directly (no Date) so there is no timezone drift. Echoes unexpected
// input unchanged rather than throwing.
export function formatIsoForDisplay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const match = ISO_DATE_PATTERN.exec(iso);
  if (!match) return iso;
  const monthIdx = Number(match[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return iso;
  return `${Number(match[3])} ${MONTHS_SHORT[monthIdx]} ${match[1]}`;
}
