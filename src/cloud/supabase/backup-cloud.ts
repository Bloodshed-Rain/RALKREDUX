import {
  CloudBackupMetadataInsert,
  CloudBackupPort,
  CloudBackupRow,
} from '@/src/domain/cloud-backup/types';
import { ensureSupabaseSession, getSupabaseClient, isSupabaseConfigured } from './client';

/** Private Storage bucket holding the snapshot JSON blobs (see migration). */
export const CLOUD_BACKUP_BUCKET = 'logbook-backups';
/** Metadata table mirroring each stored snapshot. */
const CLOUD_BACKUP_TABLE = 'logbook_backups';

const METADATA_COLUMNS =
  'id, storage_path, backup_schema_version, app_schema_version, entry_count, gear_count, signature_count, byte_size, device_label, created_at';

/**
 * Supabase implementation of the CloudBackupPort. Every call runs under the
 * authenticated user's own session; RLS scopes reads/writes to the owner. This
 * adapter holds no business logic — the orchestration lives in
 * `src/domain/cloud-backup/cloud-backup-service.ts`.
 */
export function createSupabaseBackupPort(): CloudBackupPort {
  return {
    async identify() {
      if (!isSupabaseConfigured()) return { ok: false, reason: 'not_configured' };
      const client = getSupabaseClient();
      if (!client) return { ok: false, reason: 'not_configured' };
      const session = await ensureSupabaseSession();
      if (!session?.user?.id) return { ok: false, reason: 'not_authenticated' };
      return { ok: true, userId: session.user.id };
    },

    async upload(path, json) {
      const client = getSupabaseClient();
      if (!client) throw new Error('not_configured');
      const { error } = await client.storage
        .from(CLOUD_BACKUP_BUCKET)
        .upload(path, json, { contentType: 'application/json', upsert: false });
      if (error) throw error;
    },

    async insertMetadata(input: CloudBackupMetadataInsert & { owner_id: string }) {
      const client = getSupabaseClient();
      if (!client) throw new Error('not_configured');
      const { data, error } = await client
        .from(CLOUD_BACKUP_TABLE)
        .insert({
          owner_id: input.owner_id,
          storage_path: input.storage_path,
          backup_schema_version: input.backup_schema_version,
          app_schema_version: input.app_schema_version,
          entry_count: input.entry_count,
          gear_count: input.gear_count,
          signature_count: input.signature_count,
          byte_size: input.byte_size,
          device_label: input.device_label,
        })
        .select(METADATA_COLUMNS)
        .single();
      if (error || !data) throw error ?? new Error('insert_failed');
      return data as CloudBackupRow;
    },

    async list() {
      const client = getSupabaseClient();
      if (!client) throw new Error('not_configured');
      const { data, error } = await client
        .from(CLOUD_BACKUP_TABLE)
        .select(METADATA_COLUMNS)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CloudBackupRow[];
    },

    async download(path) {
      const client = getSupabaseClient();
      if (!client) throw new Error('not_configured');
      // Signed-URL + fetch is the most React-Native-robust way to read text;
      // Blob.text() is unreliable on Hermes. The signed URL is authorized by
      // the user's own SELECT policy on the private bucket.
      const { data, error } = await client.storage
        .from(CLOUD_BACKUP_BUCKET)
        .createSignedUrl(path, 60);
      if (error || !data?.signedUrl) throw error ?? new Error('signed_url_failed');
      const response = await fetch(data.signedUrl);
      if (!response.ok) throw new Error('download_failed');
      return response.text();
    },

    async removeObjects(paths) {
      if (!paths.length) return;
      const client = getSupabaseClient();
      if (!client) throw new Error('not_configured');
      const { error } = await client.storage.from(CLOUD_BACKUP_BUCKET).remove(paths);
      if (error) throw error;
    },

    async deleteMetadata(ids) {
      if (!ids.length) return;
      const client = getSupabaseClient();
      if (!client) throw new Error('not_configured');
      const { error } = await client.from(CLOUD_BACKUP_TABLE).delete().in('id', ids);
      if (error) throw error;
    },
  };
}
