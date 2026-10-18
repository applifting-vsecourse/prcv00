import { PrismaService } from '@/core/prisma/prisma.service';
import { Quack } from '@/generated/prisma/client';
import { QuackMood } from '@/modules/quack/domain/quack';

type CreateQuackParams = {
  text: string;
  mood?: QuackMood;
  userId: string;
  // Optional so the seed can spread posts over time. Without it every seeded
  // quack shares one timestamp and the feed reads like a single burst.
  createdAt?: Date;
  // Turns the quack into a question. Each vote names the answer by its index.
  poll?: {
    options: string[];
    votes?: { userId: string; option: number }[];
    isClosed?: boolean;
  };
};

export async function createQuack(
  prisma: PrismaService,
  params: CreateQuackParams,
): Promise<Quack> {
  const { text, mood, userId, createdAt, poll } = params;

  const quack = await prisma.quack.create({
    data: {
      text,
      mood,
      createdAt,
      user: {
        connect: {
          id: userId,
        },
      },
      poll: poll
        ? {
            create: {
              closedAt: poll.isClosed ? new Date() : null,
              options: {
                create: poll.options.map((optionText, position) => ({
                  text: optionText,
                  position,
                })),
              },
            },
          }
        : undefined,
    },
    include: { poll: { include: { options: true } } },
  });

  if (quack.poll && poll?.votes?.length) {
    const { id: pollId, options } = quack.poll;
    const byPosition = new Map(options.map((o) => [o.position, o.id]));
    await prisma.pollVote.createMany({
      data: poll.votes.map((vote) => {
        const optionId = byPosition.get(vote.option);
        if (!optionId)
          throw new Error(`Seed poll has no answer ${vote.option}`);
        return { pollId, optionId, userId: vote.userId };
      }),
    });
  }

  return quack;
}
