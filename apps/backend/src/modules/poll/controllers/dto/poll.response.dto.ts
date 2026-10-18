import { Poll } from '@/modules/poll/domain/poll';
import { ApiProperty } from '@nestjs/swagger';

class PollOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ description: 'How many people picked this answer' })
  votes!: number;
}

export class PollResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  isClosed!: boolean;

  @ApiProperty({
    type: [PollOptionResponseDto],
    description: 'In the order the author wrote them',
  })
  options!: PollOptionResponseDto[];

  @ApiProperty()
  totalVotes!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "The signed-in user's own vote; others' votes are never shown",
  })
  myOptionId!: string | null;

  static fromDomain(poll: Poll): PollResponseDto {
    return {
      id: poll.id,
      isClosed: poll.isClosed,
      options: poll.options.map(({ id, text, votes }) => ({ id, text, votes })),
      totalVotes: poll.totalVotes,
      myOptionId: poll.myOptionId,
    };
  }
}
