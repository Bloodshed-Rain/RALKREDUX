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
