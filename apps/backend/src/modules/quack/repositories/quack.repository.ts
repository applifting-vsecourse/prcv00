import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Prisma,
  Quack as PrismaQuack,
  User as PrismaUser,
} from '@/generated/prisma/client';
import { Quack, QuackMood } from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';

const mapPrismaQuackToDomain = (
  quack: PrismaQuack & { user?: PrismaUser },
): Quack => ({
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
        username: quack.user.username ?? '',
      }
    : undefined,
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
  ],
});

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class QuackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getQuacks(filter: { search?: string } = {}): Promise<Quack[]> {
    const where = filter.search
      ? buildSearchWhere(escapeLikePattern(filter.search))
      : undefined;
    const quacks = await this.prisma.quack.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    return quacks.map(mapPrismaQuackToDomain);
  }

  async createQuack(createQuackData: {
    text: string;
    mood: QuackMood | null;
    userId: string;
  }): Promise<Quack> {
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood,
        user: { connect: { id: createQuackData.userId } },
      },
      include: { user: true },
    });
    return mapPrismaQuackToDomain(quack);
  }
}
