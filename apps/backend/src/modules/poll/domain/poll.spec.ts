import {
  assertCanClose,
  assertCanVote,
  normalizePollOption,
  NotPollAuthorError,
  PollClosedError,
} from './poll';

const open = { closedAt: null, authorId: 'author' };
const closed = {
  closedAt: new Date('2026-10-18T12:00:00Z'),
  authorId: 'author',
};

describe('poll rules', () => {
  it('lets anyone vote on an open question', () => {
    expect(() => assertCanVote(open)).not.toThrow();
  });

  it('refuses a vote on a closed question', () => {
    expect(() => assertCanVote(closed)).toThrow(PollClosedError);
  });

  it('lets the author close an open question', () => {
    expect(() => assertCanClose(open, 'author')).not.toThrow();
  });

  it('refuses closing by anyone but the author', () => {
    expect(() => assertCanClose(open, 'someone-else')).toThrow(
      NotPollAuthorError,
    );
  });

  it('refuses closing twice — closing is final', () => {
    expect(() => assertCanClose(closed, 'author')).toThrow(PollClosedError);
  });

  it('checks the author before saying it is closed', () => {
    // Someone else learns nothing about a poll they could never close.
    expect(() => assertCanClose(closed, 'someone-else')).toThrow(
      NotPollAuthorError,
    );
  });

  it.each([
    ['Pizza', 'pizza'],
    ['  Pizza ', 'pizza'],
    ['SALAD bar', 'salad bar'],
  ])('treats %j as the answer %j', (input, expected) => {
    expect(normalizePollOption(input)).toBe(expected);
  });
});
