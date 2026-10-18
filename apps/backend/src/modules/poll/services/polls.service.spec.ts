import { Poll, PollClosedError } from '@/modules/poll/domain/poll';
import { PollRepository } from '@/modules/poll/repositories/poll.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { mock } from 'jest-mock-extended';
import { PollsService } from './polls.service';

const user = { id: 'u1' } as Identity;

const aPoll = (overrides: Partial<Poll> = {}): Poll => ({
  id: 'p1',
  isClosed: false,
  options: [
    { id: 'o1', text: 'Pizza', votes: 1 },
    { id: 'o2', text: 'Sushi', votes: 0 },
  ],
  totalVotes: 1,
  myOptionId: 'o1',
  ...overrides,
});

describe('PollsService', () => {
  it('records the vote for the signed-in user and returns the fresh poll', async () => {
    const repository = mock<PollRepository>();
    repository.getPoll.mockResolvedValue(aPoll());

    await expect(
      new PollsService(repository).vote(user, 'p1', 'o1'),
    ).resolves.toEqual(aPoll());
    // the voter comes from the session, never from the request
    expect(repository.vote).toHaveBeenCalledWith('p1', 'u1', 'o1');
    expect(repository.getPoll).toHaveBeenCalledWith('p1', 'u1');
  });

  it('takes the vote back and returns the fresh poll', async () => {
    const repository = mock<PollRepository>();
    const withdrawn = aPoll({ myOptionId: null, totalVotes: 0 });
    repository.getPoll.mockResolvedValue(withdrawn);

    await expect(
      new PollsService(repository).withdrawVote(user, 'p1'),
    ).resolves.toEqual(withdrawn);
    expect(repository.withdrawVote).toHaveBeenCalledWith('p1', 'u1');
  });

  it('closes as the signed-in user and returns the closed poll', async () => {
    const repository = mock<PollRepository>();
    repository.getPoll.mockResolvedValue(aPoll({ isClosed: true }));

    await expect(
      new PollsService(repository).close(user, 'p1'),
    ).resolves.toMatchObject({ isClosed: true });
    expect(repository.close).toHaveBeenCalledWith('p1', 'u1');
  });

  it('does not report a poll after a refused vote', async () => {
    const repository = mock<PollRepository>();
    repository.vote.mockRejectedValue(new PollClosedError());

    await expect(
      new PollsService(repository).vote(user, 'p1', 'o1'),
    ).rejects.toBeInstanceOf(PollClosedError);
    expect(repository.getPoll).not.toHaveBeenCalled();
  });
});
