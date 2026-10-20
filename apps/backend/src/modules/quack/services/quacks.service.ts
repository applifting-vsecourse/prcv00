import {
  NotQuackAuthorError,
  Quack,
  QuackMood,
  QuackNotFoundError,
} from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable } from '@nestjs/common';

// People type handles the way they see them ("@alice"); the username is stored
// without the "@". A blank term means "no filter", not "match nothing".
const normalizeSearchTerm = (search?: string): string | undefined => {
  const term = search?.trim().replace(/^@/, '').trim();
  return term ? term : undefined;
};

@Injectable()
export class QuacksService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(
    viewer: Identity,
    filter: { search?: string } = {},
  ): Promise<Quack[]> {
    return this.quackRepository.getQuacks({
      search: normalizeSearchTerm(filter.search),
      viewerId: viewer.id,
    });
  }

  async createQuack(
    user: Identity,
    quackData: {
      text: string;
      mood: QuackMood | null;
      poll: { options: string[] } | null;
    },
  ): Promise<Quack> {
    return this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood,
      poll: quackData.poll,
      // the author is taken from the session, never from the request body
      userId: user.id,
    });
  }

  async deleteQuack(user: Identity, quackId: string): Promise<void> {
    const authorId = await this.quackRepository.findAuthorId(quackId);
    if (!authorId) throw new QuackNotFoundError(quackId);
    if (authorId !== user.id) throw new NotQuackAuthorError();

    // false: it was deleted between the check and now (e.g. another tab).
    if (!(await this.quackRepository.deleteQuack(quackId, user.id))) {
      throw new QuackNotFoundError(quackId);
    }
  }
}
