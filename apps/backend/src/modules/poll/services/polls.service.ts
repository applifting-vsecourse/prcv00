import { Poll } from '@/modules/poll/domain/poll';
import { PollRepository } from '@/modules/poll/repositories/poll.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable } from '@nestjs/common';

// Every call answers with the poll as the voter now sees it, so the client
// can replace its optimistic guess with the real numbers.
@Injectable()
export class PollsService {
  constructor(private readonly pollRepository: PollRepository) {}

  async vote(user: Identity, pollId: string, optionId: string): Promise<Poll> {
    await this.pollRepository.vote(pollId, user.id, optionId);
    return this.pollRepository.getPoll(pollId, user.id);
  }

  async withdrawVote(user: Identity, pollId: string): Promise<Poll> {
    await this.pollRepository.withdrawVote(pollId, user.id);
    return this.pollRepository.getPoll(pollId, user.id);
  }

  async close(user: Identity, pollId: string): Promise<Poll> {
    await this.pollRepository.close(pollId, user.id);
    return this.pollRepository.getPoll(pollId, user.id);
  }
}
