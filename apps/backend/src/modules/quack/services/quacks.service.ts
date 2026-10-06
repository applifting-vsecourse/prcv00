import { Quack, QuackMood } from '@/modules/quack/domain/quack';
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

  async getQuacks(filter: { search?: string } = {}): Promise<Quack[]> {
    return this.quackRepository.getQuacks({
      search: normalizeSearchTerm(filter.search),
    });
  }

  async createQuack(
    user: Identity,
    quackData: { text: string; mood: QuackMood | null },
  ): Promise<Quack> {
    return this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood,
      // the author is taken from the session, never from the request body
      userId: user.id,
    });
  }
}
