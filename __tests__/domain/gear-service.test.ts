import { createTestClient } from '../setup';
import { createGearService } from '@/src/domain/gear/gear-service';

let mockUuidCounter = 0;

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => {
    mockUuidCounter += 1;
    return `00000000-0000-4000-8000-${String(mockUuidCounter).padStart(12, '0')}`;
  }),
}));

describe('gear service', () => {
  beforeEach(() => {
    mockUuidCounter = 0;
  });

  it('creates gear items and reports inspection due status', async () => {
    const db = await createTestClient();
    const service = createGearService(db);

    await service.createGearItem({
      name: 'Petzl ID',
      category: 'descender',
      manufacturer: 'Petzl',
      model: 'ID',
      serial_number: 'ID-123',
      next_inspection_due: '2026-05-20',
    });
    await service.createGearItem({
      name: 'Rescue rope',
      category: 'rope',
      next_inspection_due: '2026-05-01',
    });

    const items = await service.listGearItems('2026-05-08');
    const summary = await service.getGearSummary('2026-05-08');

    expect(items.map(({ item, status }) => ({ name: item.name, status }))).toEqual([
      { name: 'Rescue rope', status: 'overdue' },
      { name: 'Petzl ID', status: 'due_soon' },
    ]);
    expect(summary).toEqual({
      totalItems: 2,
      activeItems: 2,
      retiredItems: 0,
      overdueItems: 1,
      dueSoonItems: 1,
    });
  });

  it('records inspections and updates the next due date', async () => {
    const db = await createTestClient();
    const service = createGearService(db);
    const item = await service.createGearItem({
      name: 'Harness',
      category: 'harness',
      serial_number: 'H-456',
    });

    await service.recordInspection({
      gear_id: item.id,
      inspected_on: '2026-05-08',
      result: 'pass_with_concerns',
      notes: 'Minor paint transfer; monitor next inspection.',
      next_inspection_due: '2026-06-07',
    });

    const [detail] = await service.listGearItems('2026-05-08');

    expect(detail.item.next_inspection_due).toBe('2026-06-07');
    expect(detail.item.retired_at).toBeNull();
    expect(detail.status).toBe('due_soon');
    expect(detail.latest_inspection).toEqual(
      expect.objectContaining({
        gear_id: item.id,
        inspected_on: '2026-05-08',
        result: 'pass_with_concerns',
        notes: 'Minor paint transfer; monitor next inspection.',
      }),
    );
  });

  it('retires failed gear and blocks later inspections', async () => {
    const db = await createTestClient();
    const service = createGearService(db);
    const item = await service.createGearItem({
      name: 'Carabiner',
      category: 'carabiner',
      next_inspection_due: '2026-05-15',
    });

    await service.recordInspection({
      gear_id: item.id,
      inspected_on: '2026-05-08',
      result: 'fail',
      notes: 'Gate does not close cleanly.',
      next_inspection_due: '2026-06-08',
    });

    const [detail] = await service.listGearItems('2026-05-08');

    expect(detail.status).toBe('retired');
    expect(detail.item.retired_at).toBe('2026-05-08');
    expect(detail.item.next_inspection_due).toBeNull();
    expect(detail.latest_inspection?.result).toBe('fail');
    await expect(
      service.recordInspection({
        gear_id: item.id,
        inspected_on: '2026-05-09',
        result: 'pass',
      }),
    ).rejects.toThrow('gear_retired');
  });

  it('searches the seeded gear catalog by type and typed query', async () => {
    const db = await createTestClient();
    const service = createGearService(db);

    const harnessMatches = await service.searchGearCatalog({
      query: 'avao',
      category: 'harness',
    });
    const ropeMatches = await service.searchGearCatalog({
      query: 'avao',
      category: 'rope',
    });

    expect(harnessMatches.length).toBeGreaterThan(0);
    expect(harnessMatches[0]).toEqual(
      expect.objectContaining({
        manufacturer: 'Petzl',
        category: 'harness',
      }),
    );
    expect(ropeMatches).toEqual([]);
  });

  it('lists inspection history newest first and resolves a single item detail', async () => {
    const db = await createTestClient();
    const service = createGearService(db);
    const item = await service.createGearItem({
      name: 'Rope A',
      category: 'rope',
      next_inspection_due: '2026-09-01',
    });

    await service.recordInspection({
      gear_id: item.id,
      result: 'pass',
      inspected_on: '2026-03-01',
      next_inspection_due: '2026-06-01',
    });
    await service.recordInspection({
      gear_id: item.id,
      result: 'pass_with_concerns',
      inspected_on: '2026-04-15',
      notes: 'Slight glaze on left',
      next_inspection_due: '2026-07-15',
    });
    await service.recordInspection({
      gear_id: item.id,
      result: 'pass',
      inspected_on: '2026-05-10',
      next_inspection_due: '2026-08-10',
    });

    const history = await service.listInspectionsForGear(item.id);
    expect(history.map((i) => i.inspected_on)).toEqual(['2026-05-10', '2026-04-15', '2026-03-01']);
    expect(history[1].result).toBe('pass_with_concerns');
    expect(history[1].notes).toBe('Slight glaze on left');

    const limited = await service.listInspectionsForGear(item.id, 2);
    expect(limited.map((i) => i.inspected_on)).toEqual(['2026-05-10', '2026-04-15']);

    const detail = await service.getGearItemDetailById(item.id, '2026-05-12');
    expect(detail).not.toBeNull();
    expect(detail?.item.next_inspection_due).toBe('2026-08-10');
    expect(detail?.status).toBe('current');
    expect(detail?.latest_inspection?.inspected_on).toBe('2026-05-10');

    const missing = await service.getGearItemDetailById('does-not-exist');
    expect(missing).toBeNull();
  });
});
