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
});
