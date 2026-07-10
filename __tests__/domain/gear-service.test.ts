import { createTestClient } from '../setup';
import { createGearService } from '@/src/domain/gear/gear-service';
import { createLogbookService } from '@/src/domain/logbook/logbook-service';
import { CreateEntryInput } from '@/src/domain/logbook/types';

let mockUuidCounter = 0;

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) => `sha256:${value.length}`),
  randomUUID: jest.fn(() => {
    mockUuidCounter += 1;
    return `00000000-0000-4000-8000-${String(mockUuidCounter).padStart(12, '0')}`;
  }),
}));

function draftInput(overrides: Partial<CreateEntryInput> = {}): CreateEntryInput {
  return {
    employer: 'Northwind Rope',
    site: 'Bridge 12',
    client: 'City Works',
    description: 'Inspected anchor array and installed edge protection.',
    work_hours: 7.5,
    work_task: 'Inspection',
    access_method: 'Two-rope access',
    structure_type: 'Bridge',
    max_height: 120,
    height_unit: 'ft',
    sprat_level_snapshot: 'II',
    ...overrides,
  };
}

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
      inspector_name: 'Casey Park',
      inspector_cert_number: 'IRATA-30219',
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

  it('does not let a backdated inspection clobber the live next-due date (P2-2)', async () => {
    const db = await createTestClient();
    const service = createGearService(db);
    const item = await service.createGearItem({ name: 'Rope B', category: 'rope' });

    // The most-recent inspection sets the live deadline.
    await service.recordInspection({
      gear_id: item.id,
      result: 'pass',
      inspected_on: '2026-05-20',
      next_inspection_due: '2026-08-20',
      inspector_name: 'Casey Park',
    });
    // A backdated (older) inspection recorded afterwards must NOT move the live
    // deadline — getLatestInspection orders by inspected_on, so the newer pass
    // remains authoritative for the gear_items.next_inspection_due field.
    const detail = await service.recordInspection({
      gear_id: item.id,
      result: 'pass',
      inspected_on: '2026-05-10',
      next_inspection_due: '2026-08-10',
      inspector_name: 'Casey Park',
    });

    expect(detail.item.next_inspection_due).toBe('2026-08-20');
    expect(detail.latest_inspection?.inspected_on).toBe('2026-05-20');

    const [listed] = await service.listGearItems('2026-05-21');
    expect(listed.item.next_inspection_due).toBe('2026-08-20');
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
      inspector_name: 'Casey Park',
      inspector_cert_number: 'IRATA-30219',
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
        inspector_name: 'Casey Park',
      }),
    ).rejects.toThrow('gear_retired');
  });

  it('requires an inspector identity on every inspection', async () => {
    const db = await createTestClient();
    const service = createGearService(db);
    const item = await service.createGearItem({ name: 'Locking carabiner', category: 'carabiner' });

    await expect(
      service.recordInspection({
        gear_id: item.id,
        inspected_on: '2026-05-08',
        result: 'pass',
        inspector_name: '',
      }),
    ).rejects.toThrow('inspector_identity_required');

    // Non-empty inspector name + cert succeeds and is persisted on the row.
    const detail = await service.recordInspection({
      gear_id: item.id,
      inspected_on: '2026-05-08',
      result: 'pass',
      inspector_name: 'Casey Park',
      inspector_cert_number: 'IRATA-30219',
      next_inspection_due: '2026-06-08',
    });
    expect(detail.latest_inspection).toEqual(
      expect.objectContaining({
        inspector_name: 'Casey Park',
        inspector_cert_number: 'IRATA-30219',
      }),
    );
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
      inspector_name: 'Casey Park',
    });
    await service.recordInspection({
      gear_id: item.id,
      result: 'pass_with_concerns',
      inspected_on: '2026-04-15',
      notes: 'Slight glaze on left',
      next_inspection_due: '2026-07-15',
      inspector_name: 'Casey Park',
    });
    await service.recordInspection({
      gear_id: item.id,
      result: 'pass',
      inspected_on: '2026-05-10',
      next_inspection_due: '2026-08-10',
      inspector_name: 'Casey Park',
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

  it('deletes an orphaned mis-add and rejects a second delete', async () => {
    const db = await createTestClient();
    const service = createGearService(db);
    const item = await service.createGearItem({ name: 'Duplicate rope', category: 'rope' });

    await expect(service.deleteGearItem(item.id)).resolves.toEqual({ id: item.id });
    expect(await service.listGearItems()).toHaveLength(0);
    await expect(service.deleteGearItem(item.id)).rejects.toThrow('gear_not_found');
  });

  it('deletes gear along with its inspection history', async () => {
    const db = await createTestClient();
    const service = createGearService(db);
    const item = await service.createGearItem({ name: 'Harness', category: 'harness' });

    await service.recordInspection({
      gear_id: item.id,
      result: 'pass',
      inspected_on: '2026-05-08',
      next_inspection_due: '2026-08-08',
      inspector_name: 'Casey Park',
    });

    await expect(service.deleteGearItem(item.id)).resolves.toEqual({ id: item.id });
    expect(await service.listGearItems()).toHaveLength(0);
    expect(
      await db.getAll('SELECT * FROM gear_inspections WHERE gear_id = ?', [item.id]),
    ).toHaveLength(0);
  });

  it('deletes gear referenced by an entry while the entry keeps its gear record', async () => {
    const db = await createTestClient();
    const service = createGearService(db);
    const logbook = createLogbookService(db);

    const entry = await logbook.createDraft(draftInput());
    const item = await service.createGearItem({
      name: 'Petzl ID',
      category: 'descender',
      manufacturer: 'Petzl',
      serial_number: 'ID-123',
    });
    await logbook.attachGearToEntry({ entry_id: entry.id, gear_id: item.id, role: 'descender' });

    await expect(service.deleteGearItem(item.id)).resolves.toEqual({ id: item.id });
    expect(await service.listGearItems()).toHaveLength(0);

    // The entry still shows the gear it recorded, rendered from the
    // attach-time snapshot on entry_gear_usage.
    const detail = await logbook.getEntryDetail(entry.id);
    expect(detail?.gear_usage).toHaveLength(1);
    expect(detail?.gear_usage[0].gear.name).toBe('Petzl ID');
    expect(detail?.gear_usage[0].gear.manufacturer).toBe('Petzl');
    expect(detail?.gear_usage[0].gear.serial_number).toBe('ID-123');
    expect(detail?.gear_usage[0].gear.category).toBe('descender');
  });

  it('reports last_used_at from entry gear usage so pickers can sort by relevance', async () => {
    const db = await createTestClient();
    const service = createGearService(db);
    const logbook = createLogbookService(db);

    const harness = await service.createGearItem({ name: 'Harness', category: 'harness' });
    const rope = await service.createGearItem({ name: 'Rescue rope', category: 'rope' });
    const entry = await logbook.createDraft(draftInput());
    await logbook.attachGearToEntry({ entry_id: entry.id, gear_id: harness.id, role: 'harness' });

    const items = await service.listGearItems();
    const harnessDetail = items.find(({ item }) => item.id === harness.id);
    const ropeDetail = items.find(({ item }) => item.id === rope.id);
    expect(harnessDetail?.last_used_at).toEqual(expect.any(String));
    expect(ropeDetail?.last_used_at).toBeNull();

    // The single-item read path reports the same value as the list path.
    const byId = await service.getGearItemDetailById(harness.id);
    expect(byId?.last_used_at).toBe(harnessDetail?.last_used_at);

    // Detaching clears it again.
    await logbook.removeGearFromEntry({ entry_id: entry.id, gear_id: harness.id });
    const after = await service.getGearItemDetailById(harness.id);
    expect(after?.last_used_at).toBeNull();
  });

  it('deletes retired gear — inventory is deletable regardless of lifecycle state', async () => {
    const db = await createTestClient();
    const service = createGearService(db);
    const item = await service.createGearItem({ name: 'Old carabiner', category: 'carabiner' });

    await service.recordInspection({
      gear_id: item.id,
      result: 'fail',
      inspected_on: '2026-05-08',
      inspector_name: 'Casey Park',
    });

    await expect(service.deleteGearItem(item.id)).resolves.toEqual({ id: item.id });
    expect(await service.listGearItems()).toHaveLength(0);
  });
});
