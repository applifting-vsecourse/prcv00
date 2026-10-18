import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VoteDto {
  @ApiProperty({ description: 'The answer to vote for, from this poll' })
  @IsString()
  @IsNotEmpty()
  optionId!: string;
}
