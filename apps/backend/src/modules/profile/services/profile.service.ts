import { Profile, UsernameTakenError } from '@/modules/profile/domain/profile';
import { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProfileService {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async getProfile(user: Identity): Promise<Profile> {
    return this.profileRepository.getProfile(user.id);
  }

  async updateProfile(user: Identity, profile: Profile): Promise<Profile> {
    if (
      await this.profileRepository.isUsernameTaken(profile.username, user.id)
    ) {
      throw new UsernameTakenError(profile.username);
    }

    return this.profileRepository.updateProfile(user.id, {
      // Stored the way BetterAuth's username plugin stores it: lowercase for
      // lookups and sign-in, plus the name exactly as typed for display.
      username: profile.username.toLowerCase(),
      displayUsername: profile.username,
      name: profile.name,
      // An emptied bio means "no bio", not a blank one.
      bio: profile.bio ? profile.bio : null,
      defaultQuackMood: profile.defaultQuackMood,
    });
  }
}
