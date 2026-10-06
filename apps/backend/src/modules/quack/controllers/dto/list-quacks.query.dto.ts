import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

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
}
