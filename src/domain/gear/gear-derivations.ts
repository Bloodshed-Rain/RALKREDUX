import type { GearItemDetail, GearStatus } from './types';

export interface GearSection {
  status: GearStatus;
  label: string;
  data: GearItemDetail[];
}

// Severity order for the Gear tab's status-grouped list. Overdue first (do not
// deploy), retired last.
const STATUS_ORDER: GearStatus[] = ['overdue', 'due_soon', 'current', 'unscheduled', 'retired'];

const STATUS_LABEL: Record<GearStatus, string> = {
  overdue: 'Overdue',
  due_soon: 'Due soon',
  current: 'Current',
  unscheduled: 'No schedule',
  retired: 'Retired',
};

// Buckets the (already server-sorted) gear list into status sections, in
// severity order, dropping any empty bucket. Item order within a bucket is
// preserved, so the existing server sort (next-due asc, name) carries through.
export function groupGearByStatus(items: GearItemDetail[]): GearSection[] {
  return STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABEL[status],
    data: items.filter((detail) => detail.status === status),
  })).filter((section) => section.data.length > 0);
}
