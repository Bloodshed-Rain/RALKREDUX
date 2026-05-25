/**
 * Cloud backup & restore domain types.
 *
 * The orchestration logic (`cloud-backup-service.ts`) depends only on the
 * `CloudBackupPort` interface, never on Supabase directly — so it stays
 * `DbClient`-only and unit-testable under better-sqlite3. The Supabase
 * implementation of the port lives in `src/cloud/supabase/backup-cloud.ts`.
 */

/** A stored backup's metadata row (mirrors `public.logbook_backups`). */
export interface CloudBackupRow {
  id: string;
  storage_path: string;
  backup_schema_version: number;
  /** High-water mark of schema_migrations.id captured in the snapshot. */
  app_schema_version: number;
  entry_count: number;
  gear_count: number;
  signature_count: number;
  byte_size: number;
  device_label: string | null;
  created_at: string;
}

/** Fields the client computes when recording a new backup. */
export interface CloudBackupMetadataInsert {
  storage_path: string;
  backup_schema_version: number;
  app_schema_version: number;
  entry_count: number;
  gear_count: number;
  signature_count: number;
  byte_size: number;
  device_label: string | null;
}

/**
 * Supabase-agnostic port the orchestration service talks to. Every method runs
 * under the authenticated user's own session; RLS enforces ownership.
 */
export interface CloudBackupPort {
  /** Resolve the signed-in owner, or why the feature is unavailable. */
  identify(): Promise<
    { ok: true; userId: string } | { ok: false; reason: 'not_configured' | 'not_authenticated' }
  >;
  /** Upload the snapshot JSON blob to `path` in the backups bucket. */
  upload(path: string, json: string): Promise<void>;
  /** Insert the metadata row and return it (server assigns id + created_at). */
  insertMetadata(input: CloudBackupMetadataInsert & { owner_id: string }): Promise<CloudBackupRow>;
  /** List the owner's backups, newest first. */
  list(): Promise<CloudBackupRow[]>;
  /** Download a snapshot blob by storage path. */
  download(path: string): Promise<string>;
  /** Delete blob objects by storage path (used when pruning). */
  removeObjects(paths: string[]): Promise<void>;
  /** Delete metadata rows by id (used when pruning). */
  deleteMetadata(ids: string[]): Promise<void>;
}

export type BackupNowResult =
  | { ok: true; backup: CloudBackupRow }
  | { ok: false; reason: 'not_configured' | 'not_authenticated' | 'backup_failed' };

export type ListBackupsResult =
  | { ok: true; backups: CloudBackupRow[] }
  | { ok: false; reason: 'not_configured' | 'not_authenticated' | 'list_failed' };

export type RestoreResult =
  | { ok: true; restored_at: string; entries: number }
  | {
      ok: false;
      reason:
        | 'not_configured'
        | 'not_authenticated'
        | 'needs_confirmation'
        | 'not_found'
        | 'snapshot_newer'
        | 'restore_failed';
    };
