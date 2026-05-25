import { createTestClient } from '../setup';
import { createLogbookService } from '@/src/domain/logbook/logbook-service';
import {
  CLOUD_BACKUP_RETENTION,
  createCloudBackupService,
} from '@/src/domain/cloud-backup/cloud-backup-service';
import {
  CloudBackupMetadataInsert,
  CloudBackupPort,
  CloudBackupRow,
} from '@/src/domain/cloud-backup/types';
import { DbClient } from '@/src/db/client';

let mockUuidCounter = 0;

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) => `sha256:${value.length}`),
  randomUUID: jest.fn(() => {
    mockUuidCounter += 1;
    return `00000000-0000-4000-8000-${String(mockUuidCounter).padStart(12, '0')}`;
  }),
}));

type Identity =
  | { ok: true; userId: string }
  | { ok: false; reason: 'not_configured' | 'not_authenticated' };

/**
 * In-memory fake of the Supabase-backed CloudBackupPort. Stores metadata rows
 * and "object" blobs in maps so the orchestration logic can be exercised
 * without a real Supabase client. list() returns newest-first, like the table
 * index (owner_id, created_at desc).
 */
function createFakePort(identity: Identity) {
  const rows: CloudBackupRow[] = [];
  const objects = new Map<string, string>();
  let insertSeq = 0;

  const port: CloudBackupPort = {
    async identify() {
      return identity;
    },
    async upload(path, json) {
      objects.set(path, json);
    },
    async insertMetadata(input: CloudBackupMetadataInsert & { owner_id: string }) {
      insertSeq += 1;
      const row: CloudBackupRow = {
        id: `bk_${insertSeq}`,
        // Deterministic, strictly increasing so newest-first is unambiguous.
        created_at: `2026-01-01T00:00:${String(insertSeq).padStart(2, '0')}.000Z`,
        storage_path: input.storage_path,
        backup_schema_version: input.backup_schema_version,
        app_schema_version: input.app_schema_version,
        entry_count: input.entry_count,
        gear_count: input.gear_count,
        signature_count: input.signature_count,
        byte_size: input.byte_size,
        device_label: input.device_label,
      };
      rows.push(row);
      return row;
    },
    async list() {
      return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async download(path) {
      const json = objects.get(path);
      if (json === undefined) throw new Error(`no object at ${path}`);
      return json;
    },
    async removeObjects(paths) {
      for (const p of paths) objects.delete(p);
    },
    async deleteMetadata(ids) {
      for (const id of ids) {
        const i = rows.findIndex((r) => r.id === id);
        if (i >= 0) rows.splice(i, 1);
      }
    },
  };

  return { port, rows, objects };
}

async function seedEntry(db: DbClient, site: string) {
  return createLogbookService(db).createDraft({
    employer: 'Northwind Rope',
    site,
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
}

describe('cloud backup service', () => {
  beforeEach(() => {
    mockUuidCounter = 0;
  });

  it('returns not_configured when the port has no Supabase config', async () => {
    const db = await createTestClient();
    const { port } = createFakePort({ ok: false, reason: 'not_configured' });
    const result = await createCloudBackupService({ db, port }).backupNow();
    expect(result).toEqual({ ok: false, reason: 'not_configured' });
  });

  it('returns not_authenticated when the user is not signed in', async () => {
    const db = await createTestClient();
    const { port } = createFakePort({ ok: false, reason: 'not_authenticated' });
    const result = await createCloudBackupService({ db, port }).backupNow();
    expect(result).toEqual({ ok: false, reason: 'not_authenticated' });
  });

  it('uploads a snapshot, records metadata counts, and stamps cloud_state', async () => {
    const db = await createTestClient();
    await seedEntry(db, 'Tower A');
    const { port, objects } = createFakePort({ ok: true, userId: 'user-1' });

    const result = await createCloudBackupService({ db, port }).backupNow();

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.backup.entry_count).toBe(1);
    expect(result.backup.storage_path.startsWith('user-1/')).toBe(true);
    // The blob was actually uploaded under that path.
    expect(objects.has(result.backup.storage_path)).toBe(true);
    // cloud_state points at the new backup id.
    const cloudState = await db.get<{ last_backup_id: string | null; last_backup_at: string | null }>(
      "SELECT last_backup_id, last_backup_at FROM cloud_state WHERE id = 'local'",
    );
    expect(cloudState?.last_backup_id).toBe(result.backup.id);
    expect(cloudState?.last_backup_at).toEqual(expect.any(String));
  });

  it('prunes to the newest N backups, deleting both objects and metadata', async () => {
    const db = await createTestClient();
    const { port, rows, objects } = createFakePort({ ok: true, userId: 'user-1' });
    const service = createCloudBackupService({ db, port });

    // One more than the retention cap; each call gets a distinct timestamped path.
    let tick = 0;
    const ticked = createCloudBackupService({
      db,
      port,
      now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, (tick += 1))),
    });
    for (let i = 0; i < CLOUD_BACKUP_RETENTION + 1; i++) {
      await ticked.backupNow();
    }
    void service;

    expect(rows).toHaveLength(CLOUD_BACKUP_RETENTION);
    expect(objects.size).toBe(CLOUD_BACKUP_RETENTION);
  });

  it('restores into an empty local database', async () => {
    const sourceDb = await createTestClient();
    await seedEntry(sourceDb, 'Bridge 12');
    const { port } = createFakePort({ ok: true, userId: 'user-1' });
    const backup = await createCloudBackupService({ db: sourceDb, port }).backupNow();
    if (!backup.ok) throw new Error('expected backup ok');

    const targetDb = await createTestClient();
    const result = await createCloudBackupService({ db: targetDb, port }).restoreFromCloud(
      backup.backup.id,
    );

    expect(result.ok).toBe(true);
    const entries = await targetDb.getAll<{ site: string }>('SELECT site FROM entries');
    expect(entries.map((e) => e.site)).toEqual(['Bridge 12']);
  });

  it('refuses to overwrite a non-empty local database without force', async () => {
    const sourceDb = await createTestClient();
    await seedEntry(sourceDb, 'Bridge 12');
    const { port } = createFakePort({ ok: true, userId: 'user-1' });
    const backup = await createCloudBackupService({ db: sourceDb, port }).backupNow();
    if (!backup.ok) throw new Error('expected backup ok');

    const targetDb = await createTestClient();
    await seedEntry(targetDb, 'Existing local site');
    const result = await createCloudBackupService({ db: targetDb, port }).restoreFromCloud(
      backup.backup.id,
    );

    expect(result).toEqual({ ok: false, reason: 'needs_confirmation' });
    // Local data must be untouched.
    const entries = await targetDb.getAll<{ site: string }>('SELECT site FROM entries');
    expect(entries.map((e) => e.site)).toEqual(['Existing local site']);
  });

  it('overwrites a non-empty local database when force is set', async () => {
    const sourceDb = await createTestClient();
    await seedEntry(sourceDb, 'Bridge 12');
    const { port } = createFakePort({ ok: true, userId: 'user-1' });
    const backup = await createCloudBackupService({ db: sourceDb, port }).backupNow();
    if (!backup.ok) throw new Error('expected backup ok');

    const targetDb = await createTestClient();
    await seedEntry(targetDb, 'Existing local site');
    const result = await createCloudBackupService({ db: targetDb, port }).restoreFromCloud(
      backup.backup.id,
      { force: true },
    );

    expect(result.ok).toBe(true);
    const entries = await targetDb.getAll<{ site: string }>('SELECT site FROM entries');
    expect(entries.map((e) => e.site)).toEqual(['Bridge 12']);
  });

  it('returns backup_failed when the upload throws', async () => {
    const db = await createTestClient();
    const { port } = createFakePort({ ok: true, userId: 'user-1' });
    port.upload = async () => {
      throw new Error('network down');
    };
    const result = await createCloudBackupService({ db, port }).backupNow();
    expect(result).toEqual({ ok: false, reason: 'backup_failed' });
  });

  it('captures a freshly signed entry in the backup blob', async () => {
    const db = await createTestClient();
    const entry = await seedEntry(db, 'Tower A');
    await createLogbookService(db).signEntryLocal({
      entry_id: entry.id,
      supervisor_name: 'Jordan Lee',
      supervisor_scheme: 'sprat',
      supervisor_cert_number: 'SPRAT-1234',
      signature_path: 'M 100 200 L 300 160',
      attestation_accepted: true,
    });
    const { port, objects } = createFakePort({ ok: true, userId: 'user-1' });

    const result = await createCloudBackupService({ db, port }).backupNow();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');

    const uploaded = JSON.parse(objects.get(result.backup.storage_path) ?? '{}');
    expect(uploaded.data.signatures).toHaveLength(1);
    expect(uploaded.data.signatures[0].supervisor_name).toBe('Jordan Lee');
    expect(result.backup.signature_count).toBe(1);
  });

  it('lists backups newest-first', async () => {
    const db = await createTestClient();
    const { port } = createFakePort({ ok: true, userId: 'user-1' });
    let tick = 0;
    const service = createCloudBackupService({
      db,
      port,
      now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, (tick += 1))),
    });
    await service.backupNow();
    await service.backupNow();

    const listed = await service.listBackups();
    expect(listed.ok).toBe(true);
    if (!listed.ok) throw new Error('expected ok');
    expect(listed.backups).toHaveLength(2);
    expect(listed.backups[0].created_at > listed.backups[1].created_at).toBe(true);
  });
});
