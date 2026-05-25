import { DbClient } from '@/src/db/client';
import { createBackupService } from '@/src/domain/backup/backup-service';
import { BackupSnapshot } from '@/src/domain/backup/types';
import {
  BackupNowResult,
  CloudBackupPort,
  CloudBackupRow,
  ListBackupsResult,
  RestoreResult,
} from './types';

/** Keep the most recent N backups per user; prune older ones. */
export const CLOUD_BACKUP_RETENTION = 3;

interface CloudBackupDeps {
  db: DbClient;
  port: CloudBackupPort;
  /** Injectable clock (the storage path is timestamped). */
  now?: () => Date;
  /** Human-readable device label stored alongside each backup. */
  deviceLabel?: string | null;
}

function utf8ByteLength(value: string): number {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).length;
  return Buffer.byteLength(value, 'utf8');
}

function appSchemaVersion(snapshot: BackupSnapshot): number {
  return snapshot.schema_migrations.reduce((max, row) => Math.max(max, row.id), 0);
}

/** `user-1/2026-01-01T00-00-01-000Z.json` — first path segment is the owner id. */
function snapshotPath(userId: string, at: Date): string {
  const stamp = at.toISOString().replace(/[:.]/g, '-');
  return `${userId}/${stamp}.json`;
}

async function localRowCount(db: DbClient): Promise<number> {
  // Any user-created content counts: a phone that's only finished onboarding
  // (a profile, saved supervisors) must still confirm before a restore wipes
  // it. entry_templates is excluded — every fresh install seeds 3 defaults, so
  // it never signals user data. Only a truly fresh install is "empty" (the
  // disaster-recovery case that restores silently).
  const row = await db.get<{ n: number }>(
    `SELECT
       (SELECT COUNT(*) FROM entries) +
       (SELECT COUNT(*) FROM gear_items) +
       (SELECT COUNT(*) FROM signatures) +
       (SELECT COUNT(*) FROM profiles) +
       (SELECT COUNT(*) FROM supervisors) AS n`,
  );
  return row?.n ?? 0;
}

async function stampLastBackup(db: DbClient, backupId: string, at: string): Promise<void> {
  await db.run(
    `INSERT INTO cloud_state (id, last_backup_at, last_backup_id, updated_at)
     VALUES ('local', ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       last_backup_at = excluded.last_backup_at,
       last_backup_id = excluded.last_backup_id,
       updated_at = excluded.updated_at`,
    [at, backupId, at],
  );
}

export function createCloudBackupService(deps: CloudBackupDeps) {
  const { db, port } = deps;
  const now = deps.now ?? (() => new Date());
  const deviceLabel = deps.deviceLabel ?? null;
  const backupService = createBackupService(db);

  async function prune(): Promise<void> {
    const all = await port.list(); // newest first
    if (all.length <= CLOUD_BACKUP_RETENTION) return;
    const stale = all.slice(CLOUD_BACKUP_RETENTION);
    await port.removeObjects(stale.map((r) => r.storage_path));
    await port.deleteMetadata(stale.map((r) => r.id));
  }

  return {
    async backupNow(): Promise<BackupNowResult> {
      const id = await port.identify();
      if (!id.ok) return { ok: false, reason: id.reason };

      try {
        const snapshot = await backupService.createSnapshot();
        const json = JSON.stringify(snapshot);
        const path = snapshotPath(id.userId, now());

        await port.upload(path, json);
        const row = await port.insertMetadata({
          owner_id: id.userId,
          storage_path: path,
          backup_schema_version: snapshot.backup_schema_version,
          app_schema_version: appSchemaVersion(snapshot),
          entry_count: snapshot.data.entries.length,
          gear_count: snapshot.data.gear_items.length,
          signature_count: snapshot.data.signatures.length,
          byte_size: utf8ByteLength(json),
          device_label: deviceLabel,
        });

        await prune();
        await stampLastBackup(db, row.id, row.created_at);

        return { ok: true, backup: row };
      } catch {
        return { ok: false, reason: 'backup_failed' };
      }
    },

    async listBackups(): Promise<ListBackupsResult> {
      const id = await port.identify();
      if (!id.ok) return { ok: false, reason: id.reason };
      try {
        return { ok: true, backups: await port.list() };
      } catch {
        return { ok: false, reason: 'list_failed' };
      }
    },

    async restoreFromCloud(
      backupId: string,
      opts?: { force?: boolean },
    ): Promise<RestoreResult> {
      const id = await port.identify();
      if (!id.ok) return { ok: false, reason: id.reason };

      let target: CloudBackupRow | undefined;
      try {
        target = (await port.list()).find((r) => r.id === backupId);
      } catch {
        return { ok: false, reason: 'restore_failed' };
      }
      if (!target) return { ok: false, reason: 'not_found' };

      // Restore is destructive (it wipes local tables). Only proceed silently
      // into an empty database (the new-phone disaster-recovery case); an
      // existing logbook requires an explicit force flag from a confirmed UI.
      if (!opts?.force && (await localRowCount(db)) > 0) {
        return { ok: false, reason: 'needs_confirmation' };
      }

      let snapshot: BackupSnapshot;
      try {
        snapshot = JSON.parse(await port.download(target.storage_path)) as BackupSnapshot;
      } catch {
        return { ok: false, reason: 'restore_failed' };
      }

      try {
        const result = await backupService.restoreSnapshot(snapshot);
        return { ok: true, restored_at: result.restored_at, entries: result.entries };
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message === 'backup_snapshot_newer_version') {
          return { ok: false, reason: 'snapshot_newer' };
        }
        return { ok: false, reason: 'restore_failed' };
      }
    },
  };
}
