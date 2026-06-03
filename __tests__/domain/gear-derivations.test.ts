import { groupGearByStatus } from '@/src/domain/gear/gear-derivations';
import type { GearItemDetail, GearStatus } from '@/src/domain/gear/types';

function d(id: string, status: GearStatus): GearItemDetail {
  return {
    item: {
      id,
      name: id,
      category: 'rope',
      manufacturer: null,
      model: null,
      serial_number: null,
      next_inspection_due: null,
      retired_at: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    latest_inspection: null,
    status,
  };
}

describe('groupGearByStatus', () => {
  it('returns no sections for an empty list', () => {
    expect(groupGearByStatus([])).toEqual([]);
  });

  it('orders sections by severity and suppresses empty buckets', () => {
    const sections = groupGearByStatus([d('a', 'current'), d('b', 'overdue'), d('c', 'current')]);
    expect(sections.map((s) => s.status)).toEqual(['overdue', 'current']);
    expect(sections[0].label).toBe('Overdue');
    // item order within a bucket is preserved (the array is pre-sorted server-side)
    expect(sections[1].data.map((x) => x.item.id)).toEqual(['a', 'c']);
  });

  it('covers all five statuses in severity order', () => {
    const sections = groupGearByStatus([
      d('r', 'retired'),
      d('u', 'unscheduled'),
      d('c', 'current'),
      d('ds', 'due_soon'),
      d('o', 'overdue'),
    ]);
    expect(sections.map((s) => s.status)).toEqual([
      'overdue',
      'due_soon',
      'current',
      'unscheduled',
      'retired',
    ]);
  });
});
