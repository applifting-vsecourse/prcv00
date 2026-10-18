export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 6;
export const POLL_OPTION_MAX_LENGTH = 50;

export type PollOption = {
  id: string;
  text: string;
  votes: number;
};

export type Poll = {
  id: string;
  isClosed: boolean;
  // In the order the author wrote them.
  options: PollOption[];
  totalVotes: number;
  // The viewer's own vote. Nobody else's vote is ever part of a Poll.
  myOptionId: string | null;
};

// "Pizza" and "pizza " are the same answer.
export const normalizePollOption = (text: string): string =>
  text.trim().toLowerCase();

export class PollNotFoundError extends Error {
  constructor(pollId: string) {
    super(`Poll ${pollId} not found`);
  }
}

export class PollOptionNotFoundError extends Error {
  constructor(optionId: string) {
    super(`Answer ${optionId} is not part of this question`);
  }
}

export class PollClosedError extends Error {
  constructor() {
    super('This question was closed before your vote.');
  }
}

export class NotPollAuthorError extends Error {
  constructor() {
    super('Only the author can close this question');
  }
}

// The state a vote or close decision is made on. The repository reads it
// with the poll row locked, so it can't change before the write commits.
export type LockedPollState = {
  closedAt: Date | null;
  authorId: string;
};

export const assertCanVote = (state: LockedPollState): void => {
  if (state.closedAt) throw new PollClosedError();
};

export const assertCanClose = (
  state: LockedPollState,
  userId: string,
): void => {
  if (state.authorId !== userId) throw new NotPollAuthorError();
  if (state.closedAt) throw new PollClosedError();
};
