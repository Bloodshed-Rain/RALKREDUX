import { createTestClient } from '../setup';
import { createArchiveService } from '@/src/domain/archive/archive-service';

let mockUuidCounter = 0;

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => {
    mockUuidCounter += 1;
    return `00000000-0000-4000-8000-${String(mockUuidCounter).padStart(12, '0')}`;
  }),
}));

describe('archive service', () => {
  beforeEach(() => {
    mockUuidCounter = 0;
  });

  it('creates an archive with ordered photos and reads it back', async () => {
    const db = await createTestClient();
    const service = createArchiveService(db);

    const created = await service.createArchive({
      label: '  2019–2021 SPRAT logbook  ',
      scheme: 'sprat',
      date_from: '2019-01-01',
      date_to: '2021-12-31',
      hours_claimed: 1850,
      witness_name: 'J. Rigger (L3)',
      notes: 'Scanned pages 1-40',
      photos: [{ uri: 'file:///p1.jpg', mime_type: 'image/jpeg' }, { uri: 'file:///p2.jpg' }],
    });

    expect(created.label).toBe('2019–2021 SPRAT logbook'); // trimmed
    expect(created.hours_claimed).toBe(1850);
    expect(created.photos).toHaveLength(2);
    expect(created.photos[0].uri).toBe('file:///p1.jpg');
    expect(created.photos[0].sort_order).toBe(0);
    expect(created.photos[1].sort_order).toBe(1);

    const list = await service.listArchives();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
  });

  it('updates archive metadata while leaving photos intact', async () => {
    const db = await createTestClient();
    const service = createArchiveService(db);

    const created = await service.createArchive({
      label: 'Old logbook',
      photos: [{ uri: 'file:///a.jpg' }],
    });

    const updated = await service.updateArchive(created.id, { hours_claimed: 500, notes: 'updated' });
    expect(updated.hours_claimed).toBe(500);
    expect(updated.notes).toBe('updated');
    expect(updated.label).toBe('Old logbook'); // untouched
    expect(updated.photos).toHaveLength(1);
    expect(updated.updated_at >= created.updated_at).toBe(true);
  });

  it('deletes an archive and its photos', async () => {
    const db = await createTestClient();
    const service = createArchiveService(db);

    const created = await service.createArchive({
      label: 'Old',
      photos: [{ uri: 'file:///a.jpg' }, { uri: 'file:///b.jpg' }],
    });

    await service.deleteArchive(created.id);
    expect(await service.getArchive(created.id)).toBeNull();

    const remainingPhotos = await db.getAll('SELECT * FROM archive_photos WHERE archive_id = ?', [
      created.id,
    ]);
    expect(remainingPhotos).toHaveLength(0);
  });

  it('throws archive_not_found when updating a missing archive', async () => {
    const db = await createTestClient();
    const service = createArchiveService(db);

    await expect(service.updateArchive('nope', { label: 'x' })).rejects.toThrow('archive_not_found');
  });
});
