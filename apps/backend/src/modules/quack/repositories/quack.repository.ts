import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma, User } from '@/generated/prisma/client';
import {
  mapPrismaPollToDomain,
  pollInclude,
} from '@/modules/poll/repositories/poll.repository';
import {
  Quack,
  QuackAuthor,
  QuackMood,
  QuackNotFoundError,
  ReplyToDeletedQuackError,
} from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';

const quackInclude = (viewerId: string) =>
  ({
    user: true,
    poll: { include: pollInclude(viewerId) },
    // Who a reply answers, and who started its conversation.
    parent: { select: { user: true } },
    root: { select: { id: true, user: true } },
    // Derived on every read, never stored: placeholders don't count.
    _count: { select: { thread: { where: { deletedAt: null } } } },
  }) as const satisfies Prisma.QuackInclude;

type PrismaQuackWithRelations = Prisma.QuackGetPayload<{
  include: ReturnType<typeof quackInclude>;
}>;

const mapPrismaUserToAuthor = (user: User | null): QuackAuthor | null =>
  user
    ? {
        id: user.id,
        name: user.name,
        // displayUsername keeps the capitals the author chose; username is
        // BetterAuth's lowercase lookup copy (and the only one older rows have).
        username: user.displayUsername ?? user.username ?? '',
      }
    : null;

const mapPrismaQuackToDomain = (quack: PrismaQuackWithRelations): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  user: mapPrismaUserToAuthor(quack.user),
  poll: quack.poll ? mapPrismaPollToDomain(quack.poll) : null,
  isDeleted: quack.deletedAt !== null,
  parentId: quack.parentId,
  root: quack.root
    ? { id: quack.root.id, user: mapPrismaUserToAuthor(quack.root.user) }
    : null,
  replyTo: quack.parent ? mapPrismaUserToAuthor(quack.parent.user) : null,
  replyCount: quack._count.thread,
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

// The plain feed (All, nothing to find) lists conversations: only quacks that
// start one, and a deleted one only while it still has replies. Finding
// something (Mine, a search, a hashtag) lists replies too, and never a
// placeholder: deleted means deleted everywhere (docs/adr/0002).
export const buildListScope = (isFinding: boolean): Prisma.QuackWhereInput =>
  isFinding
    ? { deletedAt: null }
    : {
        parentId: null,
        OR: [{ deletedAt: null }, { replies: { some: {} } }],
      };

type Tx = Prisma.TransactionClient;

type LockedQuack = {
  id: string;
  userId: string | null;
  parentId: string | null;
  rootId: string | null;
  deletedAt: Date | null;
};

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class QuackRepository {
  constructor(private readonly prisma: PrismaService) {}

  // viewerId: whose own poll votes to include ("which answer did I pick").
  // authorId: only this author's quacks and replies; combines with the search.
  // hashtag: only quacks with this (normalized) hashtag; combines with both.
  async getQuacks(filter: {
    search?: string;
    viewerId: string;
    authorId?: string;
    hashtag?: string;
  }): Promise<Quack[]> {
    const isFinding = Boolean(
      filter.search || filter.authorId || filter.hashtag,
    );
    const where: Prisma.QuackWhereInput = {
      AND: [
        buildListScope(isFinding),
        filter.search ? buildSearchWhere(escapeLikePattern(filter.search)) : {},
        filter.authorId ? { userId: filter.authorId } : {},
        // Whole-value match on the array (GIN index), so no LIKE escaping.
        filter.hashtag ? { hashtags: { has: filter.hashtag } } : {},
      ],
    };
    const quacks = await this.prisma.quack.findMany({
      where,
      include: quackInclude(filter.viewerId),
      orderBy: { createdAt: 'desc' },
    });
    return quacks.map(mapPrismaQuackToDomain);
  }

  // The quack that started the conversation `quackId` belongs to, and every
  // reply in it (placeholders included, they hold the tree together), oldest
  // first. The caller builds the tree from parentId.
  async getConversation(quackId: string, viewerId: string): Promise<Quack[]> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      select: { id: true, rootId: true },
    });
    if (!quack) throw new QuackNotFoundError(quackId);
    const rootId = quack.rootId ?? quack.id;
    const quacks = await this.prisma.quack.findMany({
      where: { OR: [{ id: rootId }, { rootId }] },
      include: quackInclude(viewerId),
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return quacks.map(mapPrismaQuackToDomain);
  }

  async createQuack(createQuackData: {
    text: string;
    mood: QuackMood | null;
    userId: string;
    poll: { options: string[] } | null;
    hashtags: string[];
  }): Promise<Quack> {
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood,
        hashtags: createQuackData.hashtags,
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

  async createReply(replyData: {
    parentId: string;
    text: string;
    userId: string;
    hashtags: string[];
  }): Promise<Quack> {
    return this.prisma.$transaction(async (tx) => {
      // Locked, so a delete of the parent waits for this reply (and then
      // leaves a placeholder), or this reply waits for the delete and sees it.
      const parent = await this.lockQuack(tx, replyData.parentId);
      if (!parent) throw new QuackNotFoundError(replyData.parentId);
      if (parent.deletedAt) throw new ReplyToDeletedQuackError();

      const reply = await tx.quack.create({
        data: {
          text: replyData.text,
          hashtags: replyData.hashtags,
          user: { connect: { id: replyData.userId } },
          parent: { connect: { id: parent.id } },
          // Written once and never changed: replies are never moved.
          root: { connect: { id: parent.rootId ?? parent.id } },
        },
        include: quackInclude(replyData.userId),
      });
      return mapPrismaQuackToDomain(reply);
    });
  }

  // null for a quack that doesn't exist and for a placeholder: a deleted quack
  // has no author, so nobody can delete it again.
  async findAuthorId(quackId: string): Promise<string | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      select: { userId: true },
    });
    return quack?.userId ?? null;
  }

  // The author is part of every write, so even a request that slipped past
  // the service's check can only ever touch that author's quack (the caller's
  // own, unless the caller is an admin).
  //
  // Without replies the quack is deleted outright: its poll, answers and votes
  // go with it (onDelete: Cascade), and any placeholder above it that is left
  // with nothing under it goes too. With replies it becomes a placeholder:
  // its content and author are cleared and its poll deleted, its replies stay.
  // See docs/adr/0002.
  async deleteQuack(quackId: string, userId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const quack = await this.lockQuack(tx, quackId);
      if (!quack || quack.deletedAt || quack.userId !== userId) return false;

      const reply = await tx.quack.findFirst({
        where: { parentId: quackId },
        select: { id: true },
      });
      if (reply) {
        await tx.poll.deleteMany({ where: { quackId } });
        await tx.quack.updateMany({
          where: { id: quackId, userId },
          data: {
            text: null,
            mood: null,
            hashtags: [],
            userId: null,
            deletedAt: new Date(),
          },
        });
        return true;
      }

      await tx.quack.deleteMany({ where: { id: quackId, userId } });
      await this.removeEmptyPlaceholders(tx, quack.parentId);
      return true;
    });
  }

  // Walks up from `parentId` deleting placeholders that have nothing left
  // under them. Each is locked first, so two deletes of the last two replies
  // run one after the other and the second one sees the first.
  private async removeEmptyPlaceholders(
    tx: Tx,
    parentId: string | null,
  ): Promise<void> {
    let nextId = parentId;
    while (nextId) {
      const parent = await this.lockQuack(tx, nextId);
      if (!parent?.deletedAt) return;
      const reply = await tx.quack.findFirst({
        where: { parentId: parent.id },
        select: { id: true },
      });
      if (reply) return;
      await tx.quack.deleteMany({
        where: { id: parent.id, deletedAt: { not: null } },
      });
      nextId = parent.parentId;
    }
  }

  private async lockQuack(
    tx: Tx,
    quackId: string,
  ): Promise<LockedQuack | undefined> {
    const rows = await tx.$queryRaw<LockedQuack[]>`
      SELECT "id", "userId", "parentId", "rootId", "deletedAt"
      FROM "quack"
      WHERE "id" = ${quackId}
      FOR UPDATE`;
    return rows[0];
  }
}
