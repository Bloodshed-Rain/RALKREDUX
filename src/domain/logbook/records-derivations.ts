import type { LogbookEntry } from './types';

export type RangeKey = '7D' | '30D' | '90D' | 'YTD' | 'ALL';
export type EntryListStatus = 'DRAFT' | 'PENDING' | 'SIGNED' | 'AMENDED';

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '7D', label: '7D' },
  { key: '30D', label: '30D' },
  { key: '90D', label: '90D' },
  { key: 'YTD', label: 'YTD' },
  { key: 'ALL', label: 'ALL' },
];

const MS_PER_DAY = 86_400_000;

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dateFromLocalIso(localIso: string): number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(localIso)) {
    const [y, m, d] = localIso.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  }
  return Date.parse(localIso);
}

export function filterEntriesInRange(
  entries: LogbookEntry[],
  today: Date,
  range: RangeKey,
): LogbookEntry[] {
  if (range === 'ALL') return entries;

  if (range === 'YTD') {
    const yearStart = new Date(today.getFullYear(), 0, 1).getTime();
    return entries.filter((entry) => {
      const ts = dateFromLocalIso(entry.date_to);
      return Number.isFinite(ts) && ts >= yearStart;
    });
  }

  const days = range === '7D' ? 7 : range === '30D' ? 30 : 90;
  const cutoff = startOfLocalDay(today) - days * MS_PER_DAY;
  return entries.filter((entry) => {
    const ts = dateFromLocalIso(entry.date_to);
    return Number.isFinite(ts) && ts >= cutoff;
  });
}

export interface RangeKpis {
  totalHours: number;
  daysOnRope: number;
  entryCount: number;
}

export function computeRangeKpis(entries: LogbookEntry[]): RangeKpis {
  const totalHours = entries.reduce((sum, entry) => {
    return sum + (Number.isFinite(entry.work_hours) ? entry.work_hours : 0);
  }, 0);
  const days = new Set(entries.map((entry) => entry.date_to)).size;
  return {
    totalHours,
    daysOnRope: days,
    entryCount: entries.length,
  };
}

export function getEntryListStatus(entry: LogbookEntry): EntryListStatus {
  if (entry.status === 'amended') return 'AMENDED';
  if (entry.status === 'signed') return 'SIGNED';
  if (entry.pending_signature_id) return 'PENDING';
  return 'DRAFT';
}

export function shortStatus(status: EntryListStatus): string {
  switch (status) {
    case 'SIGNED':
      return 'OK';
    case 'PENDING':
      return 'PEN';
    case 'DRAFT':
      return 'DRF';
    case 'AMENDED':
      return 'AMD';
  }
}
