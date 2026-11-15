import { HASHTAG_FILTER_PATTERN } from '@/modules/quack/domain/hashtag';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export const SEARCH_MAX_LENGTH = 100;

export class ListQuacksQueryDto {
  @ApiPropertyOptional({
    description:
      'Case-insensitive search in quack text, author name and username. ' +
      'Trimmed; one leading "@" is ignored. Blank means no filter.',
    example: 'duck',
    maxLength: SEARCH_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  // Trim before validating, so the length limit applies to what is searched.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MaxLength(SEARCH_MAX_LENGTH)
  q?: string;

  @ApiPropertyOptional({
    description:
      "Only the signed-in user's own quacks. Combines with q (searches only them).",
    example: true,
  })
  @IsOptional()
  // Query strings arrive as text: "true"/"false" become booleans; anything
  // else is left as-is so @IsBoolean rejects it instead of reading it as false.
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  mine?: boolean;

  @ApiPropertyOptional({
    description:
      'Only quacks with this hashtag, with or without the "#". Capitals ' +
      "don't matter; accents do. Combines with q and mine. Blank means no filter.",
    example: 'vse',
    maxLength: SEARCH_MAX_LENGTH,
  })
  @IsOptional()
  // Blank is "no filter", like q; trimmed so the checks apply to the tag itself.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString()
  @MaxLength(SEARCH_MAX_LENGTH)
  @Matches(HASHTAG_FILTER_PATTERN, {
    message: 'tag must be a single hashtag, such as vse or #vse',
  })
  tag?: string;
}
