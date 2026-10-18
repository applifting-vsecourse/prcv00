import {
  BIO_MAX_LENGTH,
  NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from '@/modules/profile/domain/profile';
import { QUACK_MOODS, QuackMood } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

// Trim before validating, so the limits apply to what is stored.
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateProfileDto {
  @ApiProperty({
    description:
      'Shown as @username. Letters, digits, dots and underscores; ' +
      'must not be taken by someone else (case-insensitive).',
    example: 'CaffeinatedDuck',
    minLength: USERNAME_MIN_LENGTH,
    maxLength: USERNAME_MAX_LENGTH,
  })
  @IsString()
  @Transform(trim)
  @Length(USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH)
  @Matches(USERNAME_PATTERN, {
    message: 'username may only contain letters, digits, dots and underscores',
  })
  username!: string;

  @ApiProperty({
    description: 'Display name',
    example: 'Caffeinated Duck',
    maxLength: NAME_MAX_LENGTH,
  })
  @IsString()
  @Transform(trim)
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({
    description: 'Short bio; omit, send null or an empty string for none',
    example: 'Three espressos in.',
    maxLength: BIO_MAX_LENGTH,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(BIO_MAX_LENGTH)
  bio?: string | null;

  @ApiProperty({
    description:
      'Mood preselected for new quacks; omit or send null for no mood',
    enum: QUACK_MOODS,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsIn(QUACK_MOODS)
  defaultQuackMood?: QuackMood | null;
}
