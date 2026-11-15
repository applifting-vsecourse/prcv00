import { PollResponseDto } from '@/modules/poll/controllers/dto/poll.response.dto';
import {
  Quack,
  QUACK_MOODS,
  QuackAuthor,
  QuackMood,
} from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';

class QuackUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  username!: string;
}

class QuackRootDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    type: QuackUserDto,
    nullable: true,
    description:
      'Who started the conversation; null when that quack was deleted',
  })
  user!: QuackUserDto | null;
}

const toUserDto = (author: QuackAuthor | null): QuackUserDto | null =>
  author
    ? { id: author.id, name: author.name, username: author.username }
    : null;

export class QuackResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'null when deleted',
  })
  text!: string | null;

  @ApiProperty({ enum: QUACK_MOODS, nullable: true })
  mood!: QuackMood | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'null when deleted',
  })
  userId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({
    type: QuackUserDto,
    nullable: true,
    description: 'null when deleted',
  })
  user!: QuackUserDto | null;

  @ApiProperty({ type: PollResponseDto, nullable: true })
  poll!: PollResponseDto | null;

  @ApiProperty({
    description:
      'A deleted quack kept because it still has replies: no text, author, ' +
      'mood or poll',
  })
  isDeleted!: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'The quack this one replies to; null if it starts a conversation',
  })
  parentId!: string | null;

  @ApiProperty({
    type: QuackRootDto,
    nullable: true,
    description: 'The conversation a reply belongs to; null if it starts one',
  })
  root!: QuackRootDto | null;

  @ApiProperty({
    type: QuackUserDto,
    nullable: true,
    description:
      'Who a reply answers; null if it starts a conversation or that quack was deleted',
  })
  replyTo!: QuackUserDto | null;

  @ApiProperty({
    description:
      'Replies in the conversation it starts, not counting deleted ones',
  })
  replyCount!: number;

  static fromDomain(quack: Quack): QuackResponseDto {
    return {
      id: quack.id,
      text: quack.text,
      mood: quack.mood,
      userId: quack.userId,
      createdAt: quack.createdAt,
      user: toUserDto(quack.user),
      poll: quack.poll ? PollResponseDto.fromDomain(quack.poll) : null,
      isDeleted: quack.isDeleted,
      parentId: quack.parentId,
      root: quack.root
        ? { id: quack.root.id, user: toUserDto(quack.root.user) }
        : null,
      replyTo: toUserDto(quack.replyTo),
      replyCount: quack.replyCount,
    };
  }
}
