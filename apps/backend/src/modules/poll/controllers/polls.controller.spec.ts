import {
  NotPollAuthorError,
  Poll,
  PollClosedError,
  PollNotFoundError,
  PollOptionNotFoundError,
} from '@/modules/poll/domain/poll';
import { PollsService } from '@/modules/poll/services/polls.service';
import { Identity } from '@/shared/auth/domain/identity';
import { HttpException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { POLL_CLOSED_CODE, PollsController } from './polls.controller';

// The real guard pulls in BetterAuth and its email templates; these tests call
// the controller methods directly, so the guard never runs anyway.
jest.mock('@/shared/auth/guards/authenticated-user.guard', () => ({
  AuthenticatedUserGuard: class {},
}));

const user = { id: 'u1' } as Identity;

const aPoll: Poll = {
  id: 'p1',
  isClosed: false,
  options: [{ id: 'o1', text: 'Pizza', votes: 1 }],
  totalVotes: 1,
  myOptionId: 'o1',
};

const httpErrorOf = async (
  call: Promise<unknown>,
): Promise<{ status: number; body: unknown }> => {
  const error: unknown = await call.catch((e: unknown) => e);
  if (!(error instanceof HttpException)) {
    throw new Error(`expected an HttpException, got ${String(error)}`);
  }
  return { status: error.getStatus(), body: error.getResponse() };
};

describe('PollsController', () => {
  it('answers a vote with the poll as the voter now sees it', async () => {
    const service = mock<PollsService>();
    service.vote.mockResolvedValue(aPoll);

    await expect(
      new PollsController(service).vote(user, 'p1', { optionId: 'o1' }),
    ).resolves.toEqual(aPoll);
    expect(service.vote).toHaveBeenCalledWith(user, 'p1', 'o1');
  });

  // The frontend tells "closed" apart from other failures by exactly this
  // status and code (features/quack/api/polls.ts), so the shape is pinned.
  type Call = (controller: PollsController) => Promise<unknown>;
  it.each<[string, Call]>([
    ['vote', (c): Promise<unknown> => c.vote(user, 'p1', { optionId: 'o1' })],
    ['withdraw', (c): Promise<unknown> => c.withdrawVote(user, 'p1')],
    ['close', (c): Promise<unknown> => c.close(user, 'p1')],
  ])(
    'answers %s on a closed question with 409 POLL_CLOSED',
    async (_label, call) => {
      const service = mock<PollsService>();
      service.vote.mockRejectedValue(new PollClosedError());
      service.withdrawVote.mockRejectedValue(new PollClosedError());
      service.close.mockRejectedValue(new PollClosedError());

      const { status, body } = await httpErrorOf(
        call(new PollsController(service)),
      );

      expect(status).toBe(409);
      expect(body).toMatchObject({
        code: POLL_CLOSED_CODE,
        message: 'This question was closed before your vote.',
      });
      expect(POLL_CLOSED_CODE).toBe('POLL_CLOSED');
    },
  );

  it('answers a close by someone other than the author with 403', async () => {
    const service = mock<PollsService>();
    service.close.mockRejectedValue(new NotPollAuthorError());

    const { status } = await httpErrorOf(
      new PollsController(service).close(user, 'p1'),
    );

    expect(status).toBe(403);
  });

  it.each([
    ['an unknown question', new PollNotFoundError('p9')],
    ["another question's answer", new PollOptionNotFoundError('o9')],
  ])('answers %s with 404', async (_label, error) => {
    const service = mock<PollsService>();
    service.vote.mockRejectedValue(error);

    const { status } = await httpErrorOf(
      new PollsController(service).vote(user, 'p1', { optionId: 'o9' }),
    );

    expect(status).toBe(404);
  });

  it('lets unexpected errors through unchanged (Nest turns them into a 500)', async () => {
    const service = mock<PollsService>();
    const boom = new Error('database is down');
    service.vote.mockRejectedValue(boom);

    await expect(
      new PollsController(service).vote(user, 'p1', { optionId: 'o1' }),
    ).rejects.toBe(boom);
  });
});
