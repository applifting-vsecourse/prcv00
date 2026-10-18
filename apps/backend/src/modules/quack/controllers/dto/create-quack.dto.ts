import {
  normalizePollOption,
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  POLL_OPTION_MAX_LENGTH,
} from '@/modules/poll/domain/poll';
import { QUACK_MOODS, QuackMood } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreatePollDto {
  @ApiProperty({
    description:
      'Answers in display order. Trimmed; empty answers and answers that ' +
      'differ only in capitals are refused.',
    example: ['Pizza', 'Sushi', 'Salad bar'],
    type: [String],
    minItems: POLL_MIN_OPTIONS,
    maxItems: POLL_MAX_OPTIONS,
  })
  @IsArray()
  @ArrayMinSize(POLL_MIN_OPTIONS)
  @ArrayMaxSize(POLL_MAX_OPTIONS)
  @IsString({ each: true })
  // Trim before validating, so the limits apply to what is stored.
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((option: unknown) =>
          typeof option === 'string' ? option.trim() : option,
        )
      : value,
  )
  @IsNotEmpty({ each: true })
  @MaxLength(POLL_OPTION_MAX_LENGTH, { each: true })
  @ArrayUnique((option: string) => normalizePollOption(option), {
    message: 'poll answers must all be different',
  })
  options!: string[];
}

export class CreateQuackDto {
  @ApiProperty({
    description: 'Body of the quack',
    example: 'Hello, world!',
    maxLength: 280,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  text!: string;

  @ApiProperty({
    description: 'Mood of the quack; omit or send null for no mood',
    enum: QUACK_MOODS,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsIn(QUACK_MOODS)
  mood?: QuackMood | null;

  @ApiProperty({
    description: 'Turns the quack into a question; its text is the question',
    type: CreatePollDto,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePollDto)
  poll?: CreatePollDto | null;
}
