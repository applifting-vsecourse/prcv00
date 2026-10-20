import { Poll } from '@/modules/poll/domain/poll';

export const QUACK_MOODS = ['happy', 'sad', 'angry', 'silly'] as const;

export type QuackMood = (typeof QUACK_MOODS)[number];

export type QuackAuthor = {
  id: string;
  name: string;
  username: string;
};

export type Quack = {
  id: string;
  text: string;
  mood: QuackMood | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: QuackAuthor;
  poll: Poll | null;
};

export class QuackNotFoundError extends Error {
  constructor(quackId: string) {
    super(`Quack ${quackId} not found`);
  }
}

export class NotQuackAuthorError extends Error {
  constructor() {
    super('Only the author can delete this quack');
  }
}
