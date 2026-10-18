import { Profile, UsernameTakenError } from '@/modules/profile/domain/profile';
import { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { mock } from 'jest-mock-extended';
import { ProfileService } from './profile.service';

const user = { id: 'u1' } as Identity;

const aProfile = (overrides: Partial<Profile> = {}): Profile => ({
  username: 'CaffeinatedDuck',
  name: 'Caffeinated Duck',
  bio: null,
  defaultQuackMood: null,
  ...overrides,
});

describe('ProfileService', () => {
  it("returns the signed-in user's profile", async () => {
    const repository = mock<ProfileRepository>();
    repository.getProfile.mockResolvedValue(aProfile());

    await expect(
      new ProfileService(repository).getProfile(user),
    ).resolves.toEqual(aProfile());
    expect(repository.getProfile).toHaveBeenCalledWith('u1');
  });

  it('stores the username lowercase for lookups and as typed for display', async () => {
    const repository = mock<ProfileRepository>();
    repository.isUsernameTaken.mockResolvedValue(false);
    repository.updateProfile.mockResolvedValue(aProfile());

    await new ProfileService(repository).updateProfile(
      user,
      aProfile({ username: 'Sleepy.Duck_2', defaultQuackMood: 'silly' }),
    );

    expect(repository.isUsernameTaken).toHaveBeenCalledWith(
      'Sleepy.Duck_2',
      'u1',
    );
    expect(repository.updateProfile).toHaveBeenCalledWith('u1', {
      username: 'sleepy.duck_2',
      displayUsername: 'Sleepy.Duck_2',
      name: 'Caffeinated Duck',
      bio: null,
      defaultQuackMood: 'silly',
    });
  });

  it('refuses a username someone else already has', async () => {
    const repository = mock<ProfileRepository>();
    repository.isUsernameTaken.mockResolvedValue(true);

    await expect(
      new ProfileService(repository).updateProfile(user, aProfile()),
    ).rejects.toBeInstanceOf(UsernameTakenError);
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });

  it('saves an emptied bio as no bio', async () => {
    const repository = mock<ProfileRepository>();
    repository.isUsernameTaken.mockResolvedValue(false);
    repository.updateProfile.mockResolvedValue(aProfile());

    await new ProfileService(repository).updateProfile(
      user,
      aProfile({ bio: '' }),
    );

    expect(repository.updateProfile).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ bio: null }),
    );
  });
});
