export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[2]}/${match[3]}/${match[1]}`;
}

export function formatDateOrDash(value: string | null | undefined): string {
  return formatDate(value) || '-';
}

export function formatDateRange(dateFrom: string | null | undefined, dateTo: string | null | undefined): string {
  const from = formatDate(dateFrom);
  const to = formatDate(dateTo);
  if (!from && !to) return '-';
  if (!to || from === to) return from;
  if (!from) return to;
  return `${from} to ${to}`;
}
