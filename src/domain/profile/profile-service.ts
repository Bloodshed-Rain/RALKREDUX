import { DbClient } from '@/src/db/client';
import { createId } from '../id';
import { CreateProfileInput, HoursBaselineInput, Profile, UpdateProfileInput } from './types';

// Columns the post-onboarding edit flow is allowed to write. Kept explicit so a
// stray/unknown key in the input can never reach the SQL.
const UPDATABLE_COLUMNS: Array<keyof UpdateProfileInput> = [
  'full_name',
  'primary_scheme',
  'sprat_id',
  'sprat_level',
  'sprat_expires_on',
  'irata_id',
  'irata_level',
  'irata_expires_on',
];

export function createProfileService(db: DbClient) {
  return {
    async getProfile(): Promise<Profile | null> {
      return db.get<Profile>('SELECT * FROM profiles LIMIT 1');
    },

    async createProfile(input: CreateProfileInput): Promise<Profile> {
      const existing = await this.getProfile();
      if (existing) return existing;

      const now = new Date().toISOString();
      const id = createId('profile');
      await db.run(
        `INSERT INTO profiles (
          id, full_name, primary_scheme,
          sprat_id, sprat_level, sprat_expires_on,
          irata_id, irata_level, irata_expires_on,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.full_name.trim(),
          input.primary_scheme,
          input.sprat_id ?? null,
          input.sprat_level ?? null,
          input.sprat_expires_on ?? null,
          input.irata_id ?? null,
          input.irata_level ?? null,
          input.irata_expires_on ?? null,
          now,
          now,
        ],
      );
      const created = await this.getProfile();
      if (!created) throw new Error('profile_create_failed');
      return created;
    },

    // Edit an existing profile. Only the keys present in `input` are written, so
    // callers can patch a single field; passing `null` clears a nullable column.
    // Throws `profile_not_found` when there is no profile to edit yet.
    async updateProfile(input: UpdateProfileInput): Promise<Profile> {
      const existing = await this.getProfile();
      if (!existing) throw new Error('profile_not_found');

      const sets: string[] = [];
      const values: Array<string | null> = [];
      for (const column of UPDATABLE_COLUMNS) {
        if (!(column in input)) continue;
        let value = input[column] ?? null;
        if (column === 'full_name' && typeof value === 'string') value = value.trim();
        sets.push(`${column} = ?`);
        values.push(value);
      }

      sets.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(existing.id);

      await db.run(`UPDATE profiles SET ${sets.join(', ')} WHERE id = ?`, values);

      const updated = await this.getProfile();
      if (!updated) throw new Error('profile_not_found');
      return updated;
    },

    // Declare the self-declared paper-logbook starting balance. Immutable once
    // set: throws `hours_baseline_already_declared` if a baseline is already on
    // record (call voidHoursBaseline first to change it). Self-declared imports
    // never touch a signature, so there is no hash impact.
    async declareHoursBaseline(input: HoursBaselineInput): Promise<Profile> {
      const existing = await this.getProfile();
      if (!existing) throw new Error('profile_not_found');
      if (existing.hours_baseline_declared_at) {
        throw new Error('hours_baseline_already_declared');
      }

      const now = new Date().toISOString();
      await db.run(
        `UPDATE profiles
           SET sprat_hours_baseline = ?,
               irata_hours_baseline = ?,
               hours_baseline_date = ?,
               hours_baseline_declared_at = ?,
               updated_at = ?
         WHERE id = ?`,
        [
          input.sprat_hours_baseline ?? null,
          input.irata_hours_baseline ?? null,
          input.transition_date,
          now,
          now,
          existing.id,
        ],
      );

      const updated = await this.getProfile();
      if (!updated) throw new Error('profile_not_found');
      return updated;
    },

    // Clear the starting-hours baseline so it can be re-declared. The only way
    // to change a locked baseline — preserves the "never silently edited" rule.
    async voidHoursBaseline(): Promise<Profile> {
      const existing = await this.getProfile();
      if (!existing) throw new Error('profile_not_found');

      await db.run(
        `UPDATE profiles
           SET sprat_hours_baseline = NULL,
               irata_hours_baseline = NULL,
               hours_baseline_date = NULL,
               hours_baseline_declared_at = NULL,
               updated_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), existing.id],
      );

      const updated = await this.getProfile();
      if (!updated) throw new Error('profile_not_found');
      return updated;
    },

    // Set or clear the local avatar URI. Pass null to remove the photo.
    // The caller owns the on-disk file lifecycle (persist/delete); this only
    // records the pointer. Throws `profile_not_found` when there is no profile
    // yet — there is nothing to attach a photo to before first-run setup.
    async updateAvatar(avatarUri: string | null): Promise<Profile> {
      const existing = await this.getProfile();
      if (!existing) throw new Error('profile_not_found');

      await db.run('UPDATE profiles SET avatar_uri = ?, updated_at = ? WHERE id = ?', [
        avatarUri,
        new Date().toISOString(),
        existing.id,
      ]);

      const updated = await this.getProfile();
      if (!updated) throw new Error('profile_not_found');
      return updated;
    },
  };
}

