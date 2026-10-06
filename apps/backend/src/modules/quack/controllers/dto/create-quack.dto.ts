import { QUACK_MOODS, QuackMood } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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
}
