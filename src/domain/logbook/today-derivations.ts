import type { CertLevel, CertScheme } from '../profile/types';
import type { GearItemDetail } from '../gear/types';
import type { DashboardSummary, ExpirationAlert, LogbookEntry } from './types';

export type AdvisoryPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type AdvisoryTone = 'red' | 'yellow' | 'ink';

export interface AdvisoryItem {
  id: string;
  code: string;
  priority: AdvisoryPriority;
  tone: AdvisoryTone;
  title: string;
  detail: string;
  inspectRoute: '/gear' | '/records' | '/more';
  dismissible: boolean;
}

export interface ActionItem {
  id: 'new-record' | 'countersign' | 'inspect-gear' | 'finish-drafts';
  label: string;
  section: string;
  emphasis?: boolean;
  route: '/entry/new' | '/records' | '/gear';
}

export interface CertProgress {
  scheme: CertScheme;
  schemeLabel: 'SPRAT' | 'IRATA';
  currentLevel: CertLevel | null;
  targetLabel: string;
  target: number;
  ratio: number;
}

const DAYS_IN_YEAR = 365;
const MS_PER_DAY = 86_400_000;

export function computeDayOf365(profileCreatedAtIso: string, today: Date): number {
  const createdMs = Date.parse(profileCreatedAtIso);
  if (!Number.isFinite(createdMs)) return 1;
  const elapsed = Math.max(0, Math.floor((today.getTime() - createdMs) / MS_PER_DAY));
  return (elapsed % DAYS_IN_YEAR) + 1;
}

export function splitDecimal(value: number): { whole: string; decimal: string } {
  const safe = Number.isFinite(value) ? value : 0;
  const [whole, decimal = '0'] = safe.toFixed(1).split('.');
  return { whole, decimal };
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dateFromLocalIso(localIso: string): number {
  // Treat "YYYY-MM-DD" as a local-midnight timestamp.
  if (/^\d{4}-\d{2}-\d{2}$/.test(localIso)) {
    const [y, m, d] = localIso.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  }
  return Date.parse(localIso);
}

export function signedHoursLast30Days(entries: LogbookEntry[], today: Date): number {
  const cutoff = startOfLocalDay(today) - 30 * MS_PER_DAY;
  return entries
    .filter((entry) => entry.status === 'signed' || entry.status === 'amended')
    .filter((entry) => {
      const ts = dateFromLocalIso(entry.date_to);
      return Number.isFinite(ts) && ts >= cutoff;
    })
    .reduce((sum, entry) => sum + (Number.isFinite(entry.work_hours) ? entry.work_hours : 0), 0);
}

export function distinctOpDaysLast30(entries: LogbookEntry[], today: Date): number {
  const cutoff = startOfLocalDay(today) - 30 * MS_PER_DAY;
  const days = new Set<string>();
  for (const entry of entries) {
    if (entry.status !== 'signed' && entry.status !== 'amended') continue;
    const ts = dateFromLocalIso(entry.date_to);
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    days.add(entry.date_to);
  }
  return days.size;
}

export function isSignedToday(entry: LogbookEntry, today: Date): boolean {
  if (entry.status !== 'signed' && entry.status !== 'amended') return false;
  const todayStart = startOfLocalDay(today);
  const tomorrowStart = todayStart + MS_PER_DAY;
  const updatedMs = Date.parse(entry.updated_at);
  return Number.isFinite(updatedMs) && updatedMs >= todayStart && updatedMs < tomorrowStart;
}

const SPRAT_TARGETS: Record<CertLevel, number> = {
  I: 500,
  II: 1000,
  III: 1000,
};

const IRATA_TARGETS: Record<CertLevel, number> = {
  I: 1000,
  II: 1000,
  III: 1000,
};

function nextLevel(current: CertLevel | null): CertLevel | null {
  if (!current) return null;
  if (current === 'I') return 'II';
  if (current === 'II') return 'III';
  return 'III';
}

export function certTarget(scheme: CertScheme, currentLevel: CertLevel | null): CertProgress | null {
  if (!currentLevel) return null;
  const targets = scheme === 'sprat' ? SPRAT_TARGETS : IRATA_TARGETS;
  const next = nextLevel(currentLevel) ?? currentLevel;
  return {
    scheme,
    schemeLabel: scheme === 'sprat' ? 'SPRAT' : 'IRATA',
    currentLevel,
    targetLabel: `${currentLevel} → ${next}`,
    target: targets[currentLevel] ?? 1000,
    ratio: 0,
  };
}

export function applyCertRatio(progress: CertProgress, signedHours: number): CertProgress {
  if (progress.target <= 0) return { ...progress, ratio: 0 };
  return { ...progress, ratio: Math.max(0, Math.min(1, signedHours / progress.target)) };
}

const PRIORITY_RANK: Record<AdvisoryPriority, number> = {
  P1: 0,
  P2: 1,
  P3: 2,
  P4: 3,
};

function daysOverdue(nextInspectionDue: string | null, today: Date): number {
  if (!nextInspectionDue) return 0;
  const dueMs = dateFromLocalIso(nextInspectionDue);
  if (!Number.isFinite(dueMs)) return 0;
  return Math.floor((startOfLocalDay(today) - dueMs) / MS_PER_DAY);
}

function daysUntilDue(nextInspectionDue: string | null, today: Date): number {
  if (!nextInspectionDue) return 0;
  const dueMs = dateFromLocalIso(nextInspectionDue);
  if (!Number.isFinite(dueMs)) return 0;
  return Math.floor((dueMs - startOfLocalDay(today)) / MS_PER_DAY);
}

export function buildAdvisories(input: {
  gear: GearItemDetail[];
  expiringCerts: ExpirationAlert[];
  today: Date;
}): AdvisoryItem[] {
  const list: AdvisoryItem[] = [];
  const overdueGear = input.gear.filter((g) => g.status === 'overdue');
  const dueSoonGear = input.gear.filter((g) => g.status === 'due_soon');

  if (overdueGear.length > 0) {
    const first = overdueGear[0];
    const more = overdueGear.length - 1;
    const titleCount = overdueGear.length === 1 ? '1 gear item' : `${overdueGear.length} gear items`;
    const days = daysOverdue(first.item.next_inspection_due, input.today);
    list.push({
      id: 'gear-overdue',
      code: 'OPS-04',
      priority: 'P1',
      tone: 'red',
      title: `${titleCount} past inspection.`,
      detail: `${first.item.name}${first.item.serial_number ? ` · ${first.item.serial_number}` : ''} · −${days}d · DO NOT DEPLOY${more > 0 ? ` · +${more} more` : ''}`,
      inspectRoute: '/gear',
      dismissible: false,
    });
  }

  if (dueSoonGear.length > 0) {
    const first = dueSoonGear[0];
    const more = dueSoonGear.length - 1;
    const titleCount = dueSoonGear.length === 1 ? '1 gear item' : `${dueSoonGear.length} gear items`;
    const days = daysUntilDue(first.item.next_inspection_due, input.today);
    list.push({
      id: 'gear-due-soon',
      code: 'OPS-07',
      priority: 'P2',
      tone: 'yellow',
      title: `${titleCount} due within 30 days.`,
      detail: `${first.item.name}${first.item.serial_number ? ` · ${first.item.serial_number}` : ''} · in ${days}d${more > 0 ? ` · +${more} more` : ''}`,
      inspectRoute: '/gear',
      dismissible: true,
    });
  }

  for (const cert of input.expiringCerts) {
    if (cert.severity !== 'warning' && cert.severity !== 'expired') continue;
    const days = cert.daysRemaining ?? 0;
    const priority: AdvisoryPriority = cert.severity === 'expired' ? 'P1' : days < 30 ? 'P3' : 'P4';
    const tone: AdvisoryTone = priority === 'P1' ? 'red' : priority === 'P3' ? 'yellow' : 'ink';
    list.push({
      id: `cert-${cert.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      code: 'CRT-01',
      priority,
      tone,
      title:
        cert.severity === 'expired'
          ? `${cert.label} expired ${Math.abs(days)}d ago.`
          : `${cert.label} expires in ${days}d.`,
      detail: cert.value ? `Renew before ${cert.value}` : 'Renew certificate to maintain logbook validity.',
      inspectRoute: '/more',
      dismissible: cert.severity !== 'expired',
    });
  }

  return list.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

export function buildActions(input: {
  summary: DashboardSummary | undefined;
  overdueGearItems: number;
  dueSoonGearItems: number;
}): ActionItem[] {
  const actions: ActionItem[] = [
    {
      id: 'new-record',
      label: 'Open new record',
      section: '03',
      emphasis: true,
      route: '/entry/new',
    },
  ];

  const pending = input.summary?.pendingSignatureRequests ?? 0;
  if (pending > 0) {
    actions.push({
      id: 'countersign',
      label: pending === 1 ? 'Countersign 1 pending' : `Countersign ${pending} pending`,
      section: '14',
      route: '/records',
    });
  }

  const gearAttention = input.overdueGearItems + input.dueSoonGearItems;
  if (gearAttention > 0) {
    actions.push({
      id: 'inspect-gear',
      label: gearAttention === 1 ? 'Inspect 1 item' : `Inspect ${gearAttention} items`,
      section: '09',
      route: '/gear',
    });
  }

  const drafts = input.summary?.draftEntries ?? 0;
  if (drafts > 0) {
    actions.push({
      id: 'finish-drafts',
      label: drafts === 1 ? 'Finish 1 draft' : `Finish ${drafts} drafts`,
      section: '11',
      route: '/records',
    });
  }

  return actions;
}
