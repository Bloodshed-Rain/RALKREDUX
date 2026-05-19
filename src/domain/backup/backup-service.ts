import { DbClient } from '@/src/db/client';
import { BackupSnapshot, RestoreBackupResult } from './types';

const RESTORE_CLEAR_ORDER = [
  'entry_attachments',
  'entry_gear_usage',
  'gear_inspections',
  'remote_signature_requests',
  'signatures',
  'entries',
  'gear_items',
  'supervisors',
  'entry_templates',
  'profiles',
] as const;

const RESTORE_INSERT_ORDER = [
  'profiles',
  'entry_templates',
  'supervisors',
  'gear_items',
  'entries',
  'signatures',
  'remote_signature_requests',
  'gear_inspections',
  'entry_gear_usage',
  'entry_attachments',
] as const;

type SnapshotTable = keyof BackupSnapshot['data'];

function nowIso(): string {
  return new Date().toISOString();
}

function assertSnapshot(value: BackupSnapshot): void {
  if (value.backup_schema_version !== 1 || value.app_flavor !== 'ralb-codex-edition') {
    throw new Error('backup_snapshot_unsupported');
  }
}

async function getAll<T>(db: DbClient, table: SnapshotTable): Promise<T[]> {
  return db.getAll<T>(`SELECT * FROM ${table}`);
}

async function insertRows(db: DbClient, table: SnapshotTable, rows: Array<Record<string, unknown>>): Promise<void> {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  if (!columns.length) return;

  const chunkSize = 50; // Keep total variables under SQLite's typical 999 limit
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const values = chunk.flatMap((row) => columns.map((col) => row[col]));
    
    await db.run(
      `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`,
      values,
    );
  }
}

export function createBackupService(db: DbClient) {
  return {
    async createSnapshot(): Promise<BackupSnapshot> {
      return {
        backup_schema_version: 1,
        exported_at: nowIso(),
        app_flavor: 'ralb-codex-edition',
        schema_migrations: await db.getAll<{ id: number; name: string; applied_at: string }>(
          'SELECT id, name, applied_at FROM schema_migrations ORDER BY id',
        ),
        data: {
          profiles: await getAll(db, 'profiles'),
          entries: await getAll(db, 'entries'),
          signatures: await getAll(db, 'signatures'),
          remote_signature_requests: await getAll(db, 'remote_signature_requests'),
          supervisors: await getAll(db, 'supervisors'),
          gear_items: await getAll(db, 'gear_items'),
          gear_inspections: await getAll(db, 'gear_inspections'),
          entry_gear_usage: await getAll(db, 'entry_gear_usage'),
          entry_attachments: await getAll(db, 'entry_attachments'),
          entry_templates: await getAll(db, 'entry_templates'),
        },
      };
    },

    async restoreSnapshot(snapshot: BackupSnapshot): Promise<RestoreBackupResult> {
      assertSnapshot(snapshot);
      const restoredAt = nowIso();

      await db.exec('BEGIN');
      try {
        await db.exec('PRAGMA defer_foreign_keys = ON;');
        for (const table of RESTORE_CLEAR_ORDER) {
          await db.run(`DELETE FROM ${table}`);
        }

        for (const table of RESTORE_INSERT_ORDER) {
          await insertRows(db, table, snapshot.data[table] as unknown as Array<Record<string, unknown>>);
        }

        await db.run(
          `INSERT OR REPLACE INTO cloud_state (
            id, last_backup_at, last_backup_id, last_restore_at, updated_at
          ) VALUES ('local', ?, NULL, ?, ?)`,
          [snapshot.exported_at, restoredAt, restoredAt],
        );
        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }

      return {
        restored_at: restoredAt,
        entries: snapshot.data.entries.length,
        gear_items: snapshot.data.gear_items.length,
        attachments: snapshot.data.entry_attachments.length,
      };
    },
  };
}
