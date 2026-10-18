import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  assertCanClose,
  assertCanVote,
  LockedPollState,
  Poll,
  PollNotFoundError,
  PollOptionNotFoundError,
} from '@/modules/poll/domain/poll';
import { Injectable } from '@nestjs/common';

// Counts come from the vote rows on every read, and only the viewer's own
// vote is loaded — enough for "which one did I pick", nothing about others.
export const pollInclude = (viewerId: string) =>
  ({
    options: {
      orderBy: { position: 'asc' },
      include: { _count: { select: { votes: true } } },
    },
    votes: { where: { userId: viewerId }, select: { optionId: true } },
  }) as const satisfies Prisma.PollInclude;

type PrismaPollWithCounts = Prisma.PollGetPayload<{
  include: ReturnType<typeof pollInclude>;
}>;

export const mapPrismaPollToDomain = (poll: PrismaPollWithCounts): Poll => {
  const options = poll.options.map((option) => ({
    id: option.id,
    text: option.text,
    votes: option._count.votes,
  }));
  return {
    id: poll.id,
    isClosed: poll.closedAt !== null,
    options,
    totalVotes: options.reduce((sum, option) => sum + option.votes, 0),
    myOptionId: poll.votes[0]?.optionId ?? null,
  };
};

type Tx = Prisma.TransactionClient;

@Injectable()
export class PollRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getPoll(pollId: string, viewerId: string): Promise<Poll> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: pollInclude(viewerId),
    });
    if (!poll) throw new PollNotFoundError(pollId);
    return mapPrismaPollToDomain(poll);
  }

  async vote(pollId: string, userId: string, optionId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      assertCanVote(await this.lockPoll(tx, pollId));
      const option = await tx.pollOption.findFirst({
        where: { id: optionId, pollId },
        select: { id: true },
      });
      if (!option) throw new PollOptionNotFoundError(optionId);
      // The (pollId, userId) key makes this "the one vote", never a second.
      await tx.pollVote.upsert({
        where: { pollId_userId: { pollId, userId } },
        create: { pollId, userId, optionId },
        update: { optionId },
      });
    });
  }

  async withdrawVote(pollId: string, userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      assertCanVote(await this.lockPoll(tx, pollId));
      // deleteMany: taking back a vote you don't have is a no-op, not an error.
      await tx.pollVote.deleteMany({ where: { pollId, userId } });
    });
  }

  async close(pollId: string, userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      assertCanClose(await this.lockPoll(tx, pollId), userId);
      await tx.poll.update({
        where: { id: pollId },
        data: { closedAt: new Date() },
      });
    });
  }

  // Votes and closing both lock the poll row first, so they run one after
  // the other: a vote that arrives after the close sees it and is refused.
  private async lockPoll(tx: Tx, pollId: string): Promise<LockedPollState> {
    const rows = await tx.$queryRaw<LockedPollState[]>`
      SELECT p."closedAt", q."userId" AS "authorId"
      FROM "poll" p
      JOIN "quack" q ON q."id" = p."quackId"
      WHERE p."id" = ${pollId}
      FOR UPDATE OF p`;
    const state = rows[0];
    if (!state) throw new PollNotFoundError(pollId);
    return state;
  }
}
