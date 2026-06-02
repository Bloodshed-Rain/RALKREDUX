import { createTestClient } from '../setup';
import { createProfileService } from '@/src/domain/profile/profile-service';

let mockUuidCounter = 0;

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => {
    mockUuidCounter += 1;
    return `00000000-0000-4000-8000-${String(mockUuidCounter).padStart(12, '0')}`;
  }),
}));

describe('profile service', () => {
  beforeEach(() => {
    mockUuidCounter = 0;
  });

  it('creates a profile with a null avatar by default', async () => {
    const db = await createTestClient();
    const service = createProfileService(db);

    const profile = await service.createProfile({
      full_name: 'Sam Tech',
      primary_scheme: 'irata',
    });

    expect(profile.avatar_uri).toBeNull();
  });

  it('sets and clears the avatar URI', async () => {
    const db = await createTestClient();
    const service = createProfileService(db);

    const created = await service.createProfile({
      full_name: 'Sam Tech',
      primary_scheme: 'sprat',
    });

    const withAvatar = await service.updateAvatar('file:///documents/avatars/abc.jpg');
    expect(withAvatar.id).toBe(created.id);
    expect(withAvatar.avatar_uri).toBe('file:///documents/avatars/abc.jpg');
    expect(withAvatar.updated_at >= created.updated_at).toBe(true);

    const cleared = await service.updateAvatar(null);
    expect(cleared.avatar_uri).toBeNull();
  });

  it('throws profile_not_found when no profile exists yet', async () => {
    const db = await createTestClient();
    const service = createProfileService(db);

    await expect(service.updateAvatar('file:///x.jpg')).rejects.toThrow('profile_not_found');
  });

  it('updates editable profile fields, preserves untouched ones, and bumps updated_at', async () => {
    const db = await createTestClient();
    const service = createProfileService(db);

    const created = await service.createProfile({
      full_name: 'Sam Tech',
      primary_scheme: 'sprat',
      sprat_level: 'II',
    });

    const updated = await service.updateProfile({
      full_name: '  Samuel Tech  ',
      sprat_level: 'III',
      sprat_expires_on: '2030-06-01',
      irata_id: '3/12345',
      irata_level: 'III',
    });

    expect(updated.id).toBe(created.id);
    expect(updated.full_name).toBe('Samuel Tech'); // trimmed
    expect(updated.sprat_level).toBe('III');
    expect(updated.sprat_expires_on).toBe('2030-06-01');
    expect(updated.irata_id).toBe('3/12345');
    expect(updated.irata_level).toBe('III');
    expect(updated.primary_scheme).toBe('sprat'); // untouched field preserved
    expect(updated.updated_at >= created.updated_at).toBe(true);
  });

  it('clears a nullable field when explicitly passed null', async () => {
    const db = await createTestClient();
    const service = createProfileService(db);

    await service.createProfile({
      full_name: 'Sam Tech',
      primary_scheme: 'sprat',
      sprat_expires_on: '2027-01-01',
    });

    const cleared = await service.updateProfile({ sprat_expires_on: null });
    expect(cleared.sprat_expires_on).toBeNull();
  });

  it('throws profile_not_found when updating with no profile', async () => {
    const db = await createTestClient();
    const service = createProfileService(db);

    await expect(service.updateProfile({ full_name: 'X' })).rejects.toThrow('profile_not_found');
  });

  it('declares a starting-hours baseline and locks it (immutable once set)', async () => {
    const db = await createTestClient();
    const service = createProfileService(db);
    await service.createProfile({ full_name: 'Sam Tech', primary_scheme: 'sprat' });

    const declared = await service.declareHoursBaseline({
      sprat_hours_baseline: 1200,
      irata_hours_baseline: null,
      transition_date: '2026-01-01',
    });
    expect(declared.sprat_hours_baseline).toBe(1200);
    expect(declared.irata_hours_baseline).toBeNull();
    expect(declared.hours_baseline_date).toBe('2026-01-01');
    expect(declared.hours_baseline_declared_at).not.toBeNull();

    // A second declaration is rejected — the baseline is locked.
    await expect(
      service.declareHoursBaseline({ sprat_hours_baseline: 5, transition_date: '2026-02-02' }),
    ).rejects.toThrow('hours_baseline_already_declared');
  });

  it('voids a baseline so it can be re-declared', async () => {
    const db = await createTestClient();
    const service = createProfileService(db);
    await service.createProfile({ full_name: 'Sam Tech', primary_scheme: 'irata' });

    await service.declareHoursBaseline({ irata_hours_baseline: 800, transition_date: '2025-06-01' });
    const voided = await service.voidHoursBaseline();
    expect(voided.irata_hours_baseline).toBeNull();
    expect(voided.hours_baseline_date).toBeNull();
    expect(voided.hours_baseline_declared_at).toBeNull();

    // After voiding, a fresh declaration is allowed again.
    const re = await service.declareHoursBaseline({
      irata_hours_baseline: 950,
      transition_date: '2025-07-01',
    });
    expect(re.irata_hours_baseline).toBe(950);
  });

  it('starts with a null, undeclared baseline', async () => {
    const db = await createTestClient();
    const service = createProfileService(db);
    const created = await service.createProfile({
      full_name: 'Sam Tech',
      primary_scheme: 'sprat',
    });
    expect(created.sprat_hours_baseline).toBeNull();
    expect(created.irata_hours_baseline).toBeNull();
    expect(created.hours_baseline_declared_at).toBeNull();
  });
});
