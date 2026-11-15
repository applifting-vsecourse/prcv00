import { PrismaService } from '@/core/prisma/prisma.service';
import {
  QuackNotFoundError,
  ReplyToDeletedQuackError,
} from '@/modules/quack/domain/quack';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import {
  buildListScope,
  escapeLikePattern,
  QuackRepository,
} from './quack.repository';

describe('escapeLikePattern', () => {
  it.each([
    ['duck', 'duck'],
    ['100%', '100\\%'],
    ['snake_case', 'snake\\_case'],
    ['back\\slash', 'back\\\\slash'],
  ])('escapes %j as %j', (input, expected) => {
    expect(escapeLikePattern(input)).toBe(expected);
  });
});

describe('buildListScope', () => {
  it('lists only conversation starts in the plain feed, a deleted one only while it has replies', () => {
    expect(buildListScope(false)).toEqual({
      parentId: null,
      OR: [{ deletedAt: null }, { replies: { some: {} } }],
    });
  });

  it('never finds a deleted quack in Mine, search or a hashtag, but finds replies', () => {
    expect(buildListScope(true)).toEqual({ deletedAt: null });
  });
});

// The rows the repository locks with SELECT … FOR UPDATE, in order.
type Locked = {
  id: string;
  userId: string | null;
  parentId: string | null;
  rootId: string | null;
  deletedAt: Date | null;
};
const live = (overrides: Partial<Locked> & { id: string }): Locked => ({
  userId: 'u1',
  parentId: null,
  rootId: null,
  deletedAt: null,
  ...overrides,
});
const placeholder = (overrides: Partial<Locked> & { id: string }): Locked =>
  live({ userId: null, deletedAt: new Date(), ...overrides });

// One mock serves as both the client and the transaction: the callback
// passed to $transaction gets the same object.
const setUp = (): {
  prisma: DeepMockProxy<PrismaService>;
  repository: QuackRepository;
  lockSequence: (...rows: (Locked | undefined)[]) => void;
  replySequence: (...hasReply: boolean[]) => void;
} => {
  const prisma = mockDeep<PrismaService>();
  prisma.$transaction.mockImplementation((callback: unknown) =>
    (callback as (tx: typeof prisma) => Promise<unknown>)(prisma),
  );
  const lockSequence = (...rows: (Locked | undefined)[]): void =>
    rows.forEach((row) =>
      prisma.$queryRaw.mockResolvedValueOnce(row ? [row] : []),
    );
  // findFirst answers "is there a reply under it?", in the order asked.
  const replySequence = (...hasReply: boolean[]): void =>
    hasReply.forEach((has) =>
      prisma.quack.findFirst.mockResolvedValueOnce(
        (has ? { id: 'some-reply' } : null) as never,
      ),
    );
  return {
    prisma,
    repository: new QuackRepository(prisma),
    lockSequence,
    replySequence,
  };
};

describe('QuackRepository.deleteQuack', () => {
  it('turns a quack with replies into a placeholder: content, author and poll gone, replies kept', async () => {
    const { prisma, repository, lockSequence, replySequence } = setUp();
    lockSequence(live({ id: 'q1' }));
    replySequence(true);

    await expect(repository.deleteQuack('q1', 'u1')).resolves.toBe(true);

    expect(prisma.poll.deleteMany).toHaveBeenCalledWith({
      where: { quackId: 'q1' },
    });
    expect(prisma.quack.updateMany).toHaveBeenCalledWith({
      // still scoped to the author, like the hard delete
      where: { id: 'q1', userId: 'u1' },
      data: {
        text: null,
        mood: null,
        hashtags: [],
        userId: null,
        deletedAt: expect.any(Date) as Date,
      },
    });
    expect(prisma.quack.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes a quack without replies outright and stops at a live parent', async () => {
    const { prisma, repository, lockSequence, replySequence } = setUp();
    lockSequence(
      live({ id: 'r1', parentId: 'q1', rootId: 'q1' }),
      live({ id: 'q1' }),
    );
    replySequence(false);

    await expect(repository.deleteQuack('r1', 'u1')).resolves.toBe(true);

    expect(prisma.quack.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.quack.deleteMany).toHaveBeenCalledWith({
      where: { id: 'r1', userId: 'u1' },
    });
    expect(prisma.quack.updateMany).not.toHaveBeenCalled();
  });

  it('removes placeholders left with nothing under them, up the tree', async () => {
    const { prisma, repository, lockSequence, replySequence } = setUp();
    // root (live) → p1 (placeholder) → p2 (placeholder) → r1 (deleted now)
    lockSequence(
      live({ id: 'r1', parentId: 'p2', rootId: 'root' }),
      placeholder({ id: 'p2', parentId: 'p1', rootId: 'root' }),
      placeholder({ id: 'p1', parentId: 'root', rootId: 'root' }),
      live({ id: 'root' }),
    );
    replySequence(false, false, false);

    await repository.deleteQuack('r1', 'u1');

    expect(prisma.quack.deleteMany.mock.calls.map(([args]) => args)).toEqual([
      { where: { id: 'r1', userId: 'u1' } },
      { where: { id: 'p2', deletedAt: { not: null } } },
      { where: { id: 'p1', deletedAt: { not: null } } },
    ]);
  });

  it('keeps a placeholder that still has another reply', async () => {
    const { prisma, repository, lockSequence, replySequence } = setUp();
    lockSequence(
      live({ id: 'r1', parentId: 'p1', rootId: 'p1' }),
      placeholder({ id: 'p1' }),
    );
    replySequence(false, true);

    await repository.deleteQuack('r1', 'u1');

    expect(prisma.quack.deleteMany).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a quack that does not exist', undefined],
    ['a placeholder', placeholder({ id: 'q1' })],
    ["someone else's quack", live({ id: 'q1', userId: 'someone-else' })],
  ])('changes nothing for %s', async (_label, row) => {
    const { prisma, repository, lockSequence } = setUp();
    lockSequence(row);

    await expect(repository.deleteQuack('q1', 'u1')).resolves.toBe(false);

    expect(prisma.quack.deleteMany).not.toHaveBeenCalled();
    expect(prisma.quack.updateMany).not.toHaveBeenCalled();
    expect(prisma.poll.deleteMany).not.toHaveBeenCalled();
  });
});

describe('QuackRepository.createReply', () => {
  const reply = { parentId: 'r1', text: 'Agreed', userId: 'u2', hashtags: [] };

  it('links a reply to its parent and to the start of the conversation', async () => {
    const { prisma, repository, lockSequence } = setUp();
    lockSequence(live({ id: 'r1', parentId: 'q1', rootId: 'q1' }));
    prisma.quack.create.mockRejectedValue(new Error('stop after the call'));

    await repository.createReply(reply).catch(() => undefined);

    expect(prisma.quack.create.mock.calls[0][0].data).toMatchObject({
      parent: { connect: { id: 'r1' } },
      root: { connect: { id: 'q1' } },
      user: { connect: { id: 'u2' } },
    });
  });

  it('starts the conversation at the parent when the parent starts one', async () => {
    const { prisma, repository, lockSequence } = setUp();
    lockSequence(live({ id: 'q1' }));
    prisma.quack.create.mockRejectedValue(new Error('stop after the call'));

    await repository
      .createReply({ ...reply, parentId: 'q1' })
      .catch(() => undefined);

    expect(prisma.quack.create.mock.calls[0][0].data).toMatchObject({
      root: { connect: { id: 'q1' } },
    });
  });

  it('refuses a reply to a deleted quack', async () => {
    const { prisma, repository, lockSequence } = setUp();
    lockSequence(placeholder({ id: 'r1', parentId: 'q1', rootId: 'q1' }));

    await expect(repository.createReply(reply)).rejects.toBeInstanceOf(
      ReplyToDeletedQuackError,
    );
    expect(prisma.quack.create).not.toHaveBeenCalled();
  });

  it('refuses a reply to a quack that does not exist', async () => {
    const { prisma, repository, lockSequence } = setUp();
    lockSequence(undefined);

    await expect(repository.createReply(reply)).rejects.toBeInstanceOf(
      QuackNotFoundError,
    );
    expect(prisma.quack.create).not.toHaveBeenCalled();
  });
});
