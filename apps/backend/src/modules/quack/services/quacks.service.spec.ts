// Example unit test — the pattern to copy for your own services.
// The repository is mocked, so the test exercises the service in isolation.
import {
  NotQuackAuthorError,
  Quack,
  QuackNotFoundError,
} from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { mock } from 'jest-mock-extended';
import { QuacksService } from './quacks.service';

const viewer = { id: 'viewer-1' } as Identity;

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: 'q1',
  text: 'quack quack',
  mood: null,
  userId: 'u1',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  user: { id: 'u1', name: 'Caffeinated Duck', username: 'CaffeinatedDuck' },
  poll: null,
  ...overrides,
});

describe('QuacksService', () => {
  it('returns quacks from the repository', async () => {
    const quacks = [aQuack()];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);

    await expect(service.getQuacks(viewer)).resolves.toEqual(quacks);
    expect(repository.getQuacks).toHaveBeenCalledTimes(1);
    // The viewer decides which poll vote is "mine"; nobody else's is loaded.
    expect(repository.getQuacks).toHaveBeenCalledWith({
      search: undefined,
      viewerId: 'viewer-1',
    });
  });

  it.each([
    ['duck', 'duck'],
    ['  duck  ', 'duck'],
    ['@alice', 'alice'],
    ['@@alice', '@alice'],
    ['pond duck', 'pond duck'],
  ])('searches for %j as %j', async (input, expected) => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    await new QuacksService(repository).getQuacks(viewer, { search: input });

    expect(repository.getQuacks).toHaveBeenCalledWith({
      search: expected,
      viewerId: 'viewer-1',
    });
  });

  it("limits the feed to the viewer's own quacks, also while searching", async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    await new QuacksService(repository).getQuacks(viewer, {
      search: 'duck',
      mine: true,
    });

    // "Mine" is the session's user — there is no way to ask for someone else's.
    expect(repository.getQuacks).toHaveBeenCalledWith({
      search: 'duck',
      viewerId: 'viewer-1',
      authorId: 'viewer-1',
    });
  });

  it('shows everyone when mine is false', async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    await new QuacksService(repository).getQuacks(viewer, { mine: false });

    expect(repository.getQuacks.mock.calls[0][0].authorId).toBeUndefined();
  });

  it.each(['', '   ', '@', ' @ '])(
    'treats %j as no search (full feed)',
    async (input) => {
      const repository = mock<QuackRepository>();
      repository.getQuacks.mockResolvedValue([]);

      await new QuacksService(repository).getQuacks(viewer, { search: input });

      expect(repository.getQuacks).toHaveBeenCalledWith({
        search: undefined,
        viewerId: 'viewer-1',
      });
    },
  );

  it('creates a quack owned by the signed-in user', async () => {
    const created = aQuack({ id: 'q2', text: 'hello' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(
      service.createQuack(user, { text: 'hello', mood: null, poll: null }),
    ).resolves.toEqual(created);
    // the author comes from the session, not from the caller's payload
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'hello',
      mood: null,
      poll: null,
      userId: 'u1',
    });
  });

  it('passes the chosen mood through to the repository', async () => {
    const created = aQuack({ id: 'q3', text: 'grr', mood: 'angry' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(
      service.createQuack(user, { text: 'grr', mood: 'angry', poll: null }),
    ).resolves.toEqual(created);
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'grr',
      mood: 'angry',
      poll: null,
      userId: 'u1',
    });
  });

  it('passes the answers of a question through, in order', async () => {
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(aQuack());

    await new QuacksService(repository).createQuack({ id: 'u1' } as Identity, {
      text: 'Lunch?',
      mood: null,
      poll: { options: ['Pizza', 'Sushi'] },
    });

    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'Lunch?',
      mood: null,
      poll: { options: ['Pizza', 'Sushi'] },
      userId: 'u1',
    });
  });

  describe('deleteQuack', () => {
    const author = { id: 'u1' } as Identity;

    it("deletes the author's own quack, scoped to the author", async () => {
      const repository = mock<QuackRepository>();
      repository.findAuthorId.mockResolvedValue('u1');
      repository.deleteQuack.mockResolvedValue(true);

      await expect(
        new QuacksService(repository).deleteQuack(author, 'q1'),
      ).resolves.toBeUndefined();
      // the delete itself names the caller, not just the check before it
      expect(repository.deleteQuack).toHaveBeenCalledWith('q1', 'u1');
    });

    it("refuses someone else's quack and deletes nothing", async () => {
      const repository = mock<QuackRepository>();
      repository.findAuthorId.mockResolvedValue('someone-else');

      await expect(
        new QuacksService(repository).deleteQuack(author, 'q1'),
      ).rejects.toBeInstanceOf(NotQuackAuthorError);
      expect(repository.deleteQuack).not.toHaveBeenCalled();
    });

    it("lets an admin delete someone else's quack, scoped to its author", async () => {
      const admin = { id: 'admin-1', role: 'admin' } as Identity;
      const repository = mock<QuackRepository>();
      repository.findAuthorId.mockResolvedValue('u1');
      repository.deleteQuack.mockResolvedValue(true);

      await expect(
        new QuacksService(repository).deleteQuack(admin, 'q1'),
      ).resolves.toBeUndefined();
      expect(repository.deleteQuack).toHaveBeenCalledWith('q1', 'u1');
    });

    it('lets an admin delete their own quack', async () => {
      const admin = { id: 'admin-1', role: 'admin' } as Identity;
      const repository = mock<QuackRepository>();
      repository.findAuthorId.mockResolvedValue('admin-1');
      repository.deleteQuack.mockResolvedValue(true);

      await new QuacksService(repository).deleteQuack(admin, 'q1');

      expect(repository.deleteQuack).toHaveBeenCalledWith('q1', 'admin-1');
    });

    it("refuses someone else's quack to a user who is not an admin", async () => {
      const user = { id: 'u2', role: 'user' } as Identity;
      const repository = mock<QuackRepository>();
      repository.findAuthorId.mockResolvedValue('u1');

      await expect(
        new QuacksService(repository).deleteQuack(user, 'q1'),
      ).rejects.toBeInstanceOf(NotQuackAuthorError);
      expect(repository.deleteQuack).not.toHaveBeenCalled();
    });

    it('reports a quack that does not exist', async () => {
      const repository = mock<QuackRepository>();
      repository.findAuthorId.mockResolvedValue(null);

      await expect(
        new QuacksService(repository).deleteQuack(author, 'missing'),
      ).rejects.toBeInstanceOf(QuackNotFoundError);
      expect(repository.deleteQuack).not.toHaveBeenCalled();
    });

    it('reports a quack deleted meanwhile (e.g. from another tab)', async () => {
      const repository = mock<QuackRepository>();
      repository.findAuthorId.mockResolvedValue('u1');
      repository.deleteQuack.mockResolvedValue(false);

      await expect(
        new QuacksService(repository).deleteQuack(author, 'q1'),
      ).rejects.toBeInstanceOf(QuackNotFoundError);
    });
  });
});
