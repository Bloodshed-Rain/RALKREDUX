import { DbClient } from '@/src/db/client';
import { createId } from '../id';
import { CreateProfileInput, Profile } from './types';

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
  };
}

