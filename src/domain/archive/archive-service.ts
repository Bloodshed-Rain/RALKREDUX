import { DbClient } from '@/src/db/client';
import { createId } from '../id';
import {
  CreateArchiveInput,
  LegacyArchive,
  LegacyArchiveWithPhotos,
  ArchivePhoto,
  UpdateArchiveInput,
} from './types';

// Columns the edit flow may write — explicit so a stray key can't reach the SQL.
const UPDATABLE_COLUMNS: Array<keyof UpdateArchiveInput> = [
  'label',
  'scheme',
  'date_from',
  'date_to',
  'hours_claimed',
  'witness_name',
  'notes',
];

export function createArchiveService(db: DbClient) {
  async function getArchive(id: string): Promise<LegacyArchiveWithPhotos | null> {
    const archive = await db.get<LegacyArchive>('SELECT * FROM logbook_archives WHERE id = ?', [id]);
    if (!archive) return null;
    const photos = await db.getAll<ArchivePhoto>(
      'SELECT * FROM archive_photos WHERE archive_id = ? ORDER BY sort_order ASC, created_at ASC',
      [id],
    );
    return { ...archive, photos };
  }

  return {
    getArchive,

    // Newest-period first; falls back to created_at for archives with no dates.
    async listArchives(): Promise<LegacyArchive[]> {
      return db.getAll<LegacyArchive>(
        `SELECT * FROM logbook_archives
         ORDER BY COALESCE(date_to, date_from, created_at) DESC, created_at DESC`,
      );
    },

    async createArchive(input: CreateArchiveInput): Promise<LegacyArchiveWithPhotos> {
      const now = new Date().toISOString();
      const id = createId('archive');
      await db.run(
        `INSERT INTO logbook_archives (
          id, label, scheme, date_from, date_to, hours_claimed, witness_name, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.label.trim(),
          input.scheme ?? null,
          input.date_from ?? null,
          input.date_to ?? null,
          input.hours_claimed ?? null,
          input.witness_name ?? null,
          input.notes ?? null,
          now,
          now,
        ],
      );

      const photos = input.photos ?? [];
      for (let i = 0; i < photos.length; i += 1) {
        await db.run(
          `INSERT INTO archive_photos (id, archive_id, uri, mime_type, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [createId('archphoto'), id, photos[i].uri, photos[i].mime_type ?? null, i, now],
        );
      }

      const created = await getArchive(id);
      if (!created) throw new Error('archive_create_failed');
      return created;
    },

    async updateArchive(id: string, input: UpdateArchiveInput): Promise<LegacyArchiveWithPhotos> {
      const existing = await db.get<LegacyArchive>('SELECT * FROM logbook_archives WHERE id = ?', [
        id,
      ]);
      if (!existing) throw new Error('archive_not_found');

      const sets: string[] = [];
      const values: Array<string | number | null> = [];
      for (const column of UPDATABLE_COLUMNS) {
        if (!(column in input)) continue;
        let value = input[column] ?? null;
        if (column === 'label' && typeof value === 'string') value = value.trim();
        sets.push(`${column} = ?`);
        values.push(value);
      }

      sets.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);

      await db.run(`UPDATE logbook_archives SET ${sets.join(', ')} WHERE id = ?`, values);

      const updated = await getArchive(id);
      if (!updated) throw new Error('archive_not_found');
      return updated;
    },

    // Hard delete. Photos are removed explicitly (not relying on FK cascade) so
    // the behavior holds regardless of the foreign_keys pragma. The on-disk
    // files are the caller's responsibility (mirrors attachment handling).
    async deleteArchive(id: string): Promise<void> {
      await db.run('DELETE FROM archive_photos WHERE archive_id = ?', [id]);
      await db.run('DELETE FROM logbook_archives WHERE id = ?', [id]);
    },
  };
}
