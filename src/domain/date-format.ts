export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[2]}/${match[3]}/${match[1]}`;
}

export function formatDateOrDash(value: string | null | undefined): string {
  return formatDate(value) || '-';
}

// For TIMESTAMP-bearing values (e.g. signed_at, exported_at) which are UTC
// instants. formatDate slices the calendar prefix off the raw ISO string with
// no zone conversion, so an instant near UTC midnight (e.g. ...T01:00:00Z)
// prints the wrong calendar day for a technician east/west of UTC. This renders
// the date in the device's local zone (or an explicit IANA zone in tests).
// Date-only values (YYYY-MM-DD) carry no instant and are returned via the slice,
// since converting them through a zone could shift the day.
export function formatTimestampDate(
  value: string | null | undefined,
  timeZone?: string,
): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return value;
  // .format() (not .formatToParts) — en-US with 2-digit month/day yields
  // "MM/DD/YYYY" directly, and avoids the iOS/Hermes formatToParts history.
  // Mirrors the Intl usage already in app/attachments.tsx.
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

export function formatTimestampDateOrDash(
  value: string | null | undefined,
  timeZone?: string,
): string {
  return formatTimestampDate(value, timeZone) || '-';
}

export function formatDateRange(dateFrom: string | null | undefined, dateTo: string | null | undefined): string {
  const from = formatDate(dateFrom);
  const to = formatDate(dateTo);
  if (!from && !to) return '-';
  if (!to || from === to) return from;
  if (!from) return to;
  return `${from} to ${to}`;
}
