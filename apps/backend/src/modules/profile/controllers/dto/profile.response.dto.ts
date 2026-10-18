import { Profile } from '@/modules/profile/domain/profile';
import { QUACK_MOODS, QuackMood } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({ description: 'As the user typed it, without the "@"' })
  username!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  bio!: string | null;

  @ApiProperty({ enum: QUACK_MOODS, nullable: true })
  defaultQuackMood!: QuackMood | null;

  static fromDomain(profile: Profile): ProfileResponseDto {
    return {
      username: profile.username,
      name: profile.name,
      bio: profile.bio,
      defaultQuackMood: profile.defaultQuackMood,
    };
  }
}
