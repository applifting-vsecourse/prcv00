import { Poll } from '@/modules/poll/domain/poll';

export const QUACK_MOODS = ['happy', 'sad', 'angry', 'silly'] as const;

export type QuackMood = (typeof QUACK_MOODS)[number];

export type QuackAuthor = {
  id: string;
  name: string;
  username: string;
};

// A quack that starts a conversation (parentId null) or a reply.
// A placeholder (isDeleted) is a deleted quack kept only because something
// still replies to it: it has no text, author, mood, hashtags or poll
// (docs/adr/0002).
export type Quack = {
  id: string;
  text: string | null;
  mood: QuackMood | null;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: QuackAuthor | null;
  poll: Poll | null;
  isDeleted: boolean;
  parentId: string | null;
  // The conversation this reply belongs to and who started it (null when that
  // quack was deleted). null for a quack that starts a conversation.
  root: { id: string; user: QuackAuthor | null } | null;
  // Who this reply answers; null for a conversation start or a deleted parent.
  replyTo: QuackAuthor | null;
  // Replies in the whole conversation, not counting placeholders. Only a
  // quack that starts a conversation has any.
  replyCount: number;
};

export class QuackNotFoundError extends Error {
  constructor(quackId: string) {
    super(`Quack ${quackId} not found`);
  }
}

export class NotQuackAuthorError extends Error {
  constructor() {
    super('Only the author or an admin can delete this quack');
  }
}

export class ReplyToDeletedQuackError extends Error {
  constructor() {
    super("A deleted quack can't be replied to");
  }
}

export class InvalidReplyError extends Error {
  constructor() {
    super('A reply is text only: no mood and no poll');
  }
}
