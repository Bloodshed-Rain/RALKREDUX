import { createTestClient } from '../setup';
import { createBackupService } from '@/src/domain/backup/backup-service';
import { createGearService } from '@/src/domain/gear/gear-service';
import { createLogbookService } from '@/src/domain/logbook/logbook-service';
import { createProfileService } from '@/src/domain/profile/profile-service';

let mockUuidCounter = 0;

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) => `sha256:${value.length}`),
  randomUUID: jest.fn(() => {
    mockUuidCounter += 1;
    return `00000000-0000-4000-8000-${String(mockUuidCounter).padStart(12, '0')}`;
  }),
}));

describe('backup service', () => {
  beforeEach(() => {
    mockUuidCounter = 0;
  });

  it('creates and restores a recovery snapshot with logbook, gear, and evidence data', async () => {
    const sourceDb = await createTestClient();
    const profileService = createProfileService(sourceDb);
    const logbookService = createLogbookService(sourceDb);
    const gearService = createGearService(sourceDb);
    const backupService = createBackupService(sourceDb);

    await profileService.createProfile({
      full_name: 'Mina Carter',
      primary_scheme: 'sprat',
      sprat_id: 'S-12345',
      sprat_level: 'III',
      sprat_expires_on: '2027-05-08',
    });
    const entry = await logbookService.createDraft({
      employer: 'Northwind Rope',
      site: 'Tower A',
      client: 'City Works',
      description: 'Inspected anchors.',
      work_hours: 8,
      work_task: 'Inspection',
      access_method: 'Two-rope access',
      structure_type: 'Tower',
      max_height: 120,
      height_unit: 'ft',
      sprat_level_snapshot: 'III',
    });
    const gear = await gearService.createGearItem({
      name: 'Avao Bod',
      category: 'harness',
      serial_number: 'H-123',
    });
    await logbookService.attachGearToEntry({
      entry_id: entry.id,
      gear_id: gear.id,
      role: 'primary harness',
    });
    await logbookService.addEntryAttachment({
      entry_id: entry.id,
      label: 'Anchor photo',
      uri: 'file:///anchor.jpg',
      mime_type: 'image/jpeg',
    });
    await logbookService.signEntryLocal({
      entry_id: entry.id,
      supervisor_name: 'Jordan Lee',
      supervisor_scheme: 'sprat',
      supervisor_cert_number: 'SPRAT-1234',
      signature_path: 'M 100 200 L 300 160',
      attestation_accepted: true,
    });

    const snapshot = await backupService.createSnapshot();
    const targetDb = await createTestClient();
    const restoreResult = await createBackupService(targetDb).restoreSnapshot(snapshot);
    const restoredDetail = await createLogbookService(targetDb).getEntryDetail(entry.id);
    const cloudState = await targetDb.get<{ last_restore_at: string | null }>(
      "SELECT last_restore_at FROM cloud_state WHERE id = 'local'",
    );

    expect(snapshot.data.entries).toHaveLength(1);
    expect(snapshot.data.signatures[0].chain_hash).toMatch(/^sha256:/);
    expect(snapshot.data.entry_gear_usage).toHaveLength(1);
    expect(snapshot.data.entry_attachments).toHaveLength(1);
    expect(restoreResult).toEqual(
      expect.objectContaining({
        entries: 1,
        gear_items: 1,
        attachments: 1,
      }),
    );
    expect(restoredDetail?.entry.site).toBe('Tower A');
    expect(restoredDetail?.signature?.supervisor_name).toBe('Jordan Lee');
    expect(restoredDetail?.gear_usage[0].gear.serial_number).toBe('H-123');
    expect(restoredDetail?.attachments[0].label).toBe('Anchor photo');
    expect(cloudState?.last_restore_at).toEqual(expect.any(String));
  });

  it('round-trips entry photos so restore does not drop them', async () => {
    const sourceDb = await createTestClient();
    const logbookService = createLogbookService(sourceDb);
    const entry = await logbookService.createDraft({
      employer: 'Northwind Rope',
      site: 'Tower A',
      client: 'City Works',
      description: 'Inspected anchors.',
      work_hours: 8,
      work_task: 'Inspection',
      access_method: 'Two-rope access',
      structure_type: 'Tower',
      max_height: 120,
      height_unit: 'ft',
      sprat_level_snapshot: 'III',
    });
    await sourceDb.run(
      'INSERT INTO entry_photos (id, entry_id, file_uri, created_at) VALUES (?, ?, ?, ?)',
      ['photo_1', entry.id, 'file:///photos/anchor.jpg', '2026-05-08T10:00:00.000Z'],
    );

    const snapshot = await createBackupService(sourceDb).createSnapshot();
    expect(snapshot.data.entry_photos).toHaveLength(1);

    const targetDb = await createTestClient();
    await createBackupService(targetDb).restoreSnapshot(snapshot);

    const restoredPhotos = await targetDb.getAll<{ id: string; file_uri: string }>(
      'SELECT id, file_uri FROM entry_photos',
    );
    expect(restoredPhotos).toEqual([{ id: 'photo_1', file_uri: 'file:///photos/anchor.jpg' }]);
  });
});
