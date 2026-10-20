import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  mapPrismaPollToDomain,
  pollInclude,
} from '@/modules/poll/repositories/poll.repository';
import { Quack, QuackMood } from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';

const quackInclude = (viewerId: string) =>
  ({
    user: true,
    poll: { include: pollInclude(viewerId) },
  }) as const satisfies Prisma.QuackInclude;

type PrismaQuackWithRelations = Prisma.QuackGetPayload<{
  include: ReturnType<typeof quackInclude>;
}>;

const mapPrismaQuackToDomain = (quack: PrismaQuackWithRelations): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  user: quack.user
    ? {
        id: quack.user.id,
        name: quack.user.name,
        // displayUsername keeps the capitals the author chose; username is
        // BetterAuth's lowercase lookup copy (and the only one older rows have).
        username: quack.user.displayUsername ?? quack.user.username ?? '',
      }
    : undefined,
  poll: quack.poll ? mapPrismaPollToDomain(quack.poll) : null,
});

// Prisma's `contains` becomes ILIKE '%term%' without escaping the term, so a
// search for "%" or "_" would match every quack. Escape them (and the escape
// character itself) so they match literally.
export const escapeLikePattern = (term: string): string =>
  term.replace(/[\\%_]/g, (char) => `\\${char}`);

const buildSearchWhere = (pattern: string): Prisma.QuackWhereInput => ({
  OR: [
    { text: { contains: pattern, mode: 'insensitive' } },
    { user: { name: { contains: pattern, mode: 'insensitive' } } },
    { user: { username: { contains: pattern, mode: 'insensitive' } } },
    {
      poll: {
        options: {
          some: { text: { contains: pattern, mode: 'insensitive' } },
        },
      },
    },
  ],
});

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class QuackRepository {
  constructor(private readonly prisma: PrismaService) {}

  // viewerId: whose own poll votes to include ("which answer did I pick").
  async getQuacks(filter: {
    search?: string;
    viewerId: string;
  }): Promise<Quack[]> {
    const where = filter.search
      ? buildSearchWhere(escapeLikePattern(filter.search))
      : undefined;
    const quacks = await this.prisma.quack.findMany({
      where,
      include: quackInclude(filter.viewerId),
      orderBy: { createdAt: 'desc' },
    });
    return quacks.map(mapPrismaQuackToDomain);
  }

  async createQuack(createQuackData: {
    text: string;
    mood: QuackMood | null;
    userId: string;
    poll: { options: string[] } | null;
  }): Promise<Quack> {
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood,
        user: { connect: { id: createQuackData.userId } },
        // Created in the same write: a question is never posted without its
        // answers, or answers without their question.
        poll: createQuackData.poll
          ? {
              create: {
                options: {
                  create: createQuackData.poll.options.map(
                    (text, position) => ({ text, position }),
                  ),
                },
              },
            }
          : undefined,
      },
      include: quackInclude(createQuackData.userId),
    });
    return mapPrismaQuackToDomain(quack);
  }

  async findAuthorId(quackId: string): Promise<string | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      select: { userId: true },
    });
    return quack?.userId ?? null;
  }

  // The author is part of the delete itself, so even a request that slipped
  // past the service's check can only ever remove the caller's own quack.
  // Its poll, answers and votes go with it (onDelete: Cascade).
  async deleteQuack(quackId: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.quack.deleteMany({
      where: { id: quackId, userId },
    });
    return count > 0;
  }
}
