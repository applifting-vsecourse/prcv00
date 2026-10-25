import {
  NotQuackAuthorError,
  QuackNotFoundError,
} from '@/modules/quack/domain/quack';
import { QuacksService } from '@/modules/quack/services/quacks.service';
import { Identity } from '@/shared/auth/domain/identity';
import { HttpException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { QuacksController } from './quacks.controller';

// The real guard pulls in BetterAuth and its email templates; these tests call
// the controller methods directly, so the guard never runs anyway.
jest.mock('@/shared/auth/guards/authenticated-user.guard', () => ({
  AuthenticatedUserGuard: class {},
}));

const user = { id: 'u1' } as Identity;

const statusOf = async (call: Promise<unknown>): Promise<number> => {
  const error: unknown = await call.catch((e: unknown) => e);
  if (!(error instanceof HttpException)) {
    throw new Error(`expected an HttpException, got ${String(error)}`);
  }
  return error.getStatus();
};

describe('QuacksController.delete', () => {
  it("deletes the signed-in user's quack", async () => {
    const service = mock<QuacksService>();
    service.deleteQuack.mockResolvedValue(undefined);

    await expect(
      new QuacksController(service).delete(user, 'q1'),
    ).resolves.toBeUndefined();
    // the deleter comes from the session, never from the request
    expect(service.deleteQuack).toHaveBeenCalledWith(user, 'q1');
  });

  it("answers 403 for someone else's quack", async () => {
    const service = mock<QuacksService>();
    service.deleteQuack.mockRejectedValue(new NotQuackAuthorError());

    await expect(
      statusOf(new QuacksController(service).delete(user, 'q1')),
    ).resolves.toBe(403);
  });

  it('answers 404 for a quack that does not exist (or is already gone)', async () => {
    const service = mock<QuacksService>();
    service.deleteQuack.mockRejectedValue(new QuackNotFoundError('q9'));

    await expect(
      statusOf(new QuacksController(service).delete(user, 'q9')),
    ).resolves.toBe(404);
  });

  it('lets unexpected errors through unchanged (Nest turns them into a 500)', async () => {
    const service = mock<QuacksService>();
    const boom = new Error('database is down');
    service.deleteQuack.mockRejectedValue(boom);

    await expect(new QuacksController(service).delete(user, 'q1')).rejects.toBe(
      boom,
    );
  });
});
