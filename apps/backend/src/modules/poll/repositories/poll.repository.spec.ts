import { mapPrismaPollToDomain, pollInclude } from './poll.repository';

type PrismaPoll = Parameters<typeof mapPrismaPollToDomain>[0];

const aPrismaPoll = (overrides: Partial<PrismaPoll> = {}): PrismaPoll => ({
  id: 'p1',
  quackId: 'q1',
  closedAt: null,
  createdAt: new Date('2026-10-18T12:00:00Z'),
  options: [
    {
      id: 'o1',
      pollId: 'p1',
      text: 'Pizza',
      position: 0,
      _count: { votes: 2 },
    },
    {
      id: 'o2',
      pollId: 'p1',
      text: 'Sushi',
      position: 1,
      _count: { votes: 1 },
    },
  ],
  votes: [],
  ...overrides,
});

describe('pollInclude', () => {
  // Nobody may see who picked what: the only vote row ever loaded is the
  // viewer's own, to mark "your answer".
  it("loads only the viewer's own vote", () => {
    expect(pollInclude('viewer-1').votes).toEqual({
      where: { userId: 'viewer-1' },
      select: { optionId: true },
    });
  });

  it('keeps answers in the order the author wrote them', () => {
    expect(pollInclude('viewer-1').options.orderBy).toEqual({
      position: 'asc',
    });
  });
});

describe('mapPrismaPollToDomain', () => {
  it('counts votes per answer and in total', () => {
    const poll = mapPrismaPollToDomain(aPrismaPoll());

    expect(poll.options).toEqual([
      { id: 'o1', text: 'Pizza', votes: 2 },
      { id: 'o2', text: 'Sushi', votes: 1 },
    ]);
    expect(poll.totalVotes).toBe(3);
  });

  it("marks the viewer's own answer, and none when they haven't voted", () => {
    expect(
      mapPrismaPollToDomain(aPrismaPoll({ votes: [{ optionId: 'o2' }] }))
        .myOptionId,
    ).toBe('o2');
    expect(mapPrismaPollToDomain(aPrismaPoll()).myOptionId).toBeNull();
  });

  it('is closed exactly when it has a closing time', () => {
    expect(mapPrismaPollToDomain(aPrismaPoll()).isClosed).toBe(false);
    expect(
      mapPrismaPollToDomain(aPrismaPoll({ closedAt: new Date() })).isClosed,
    ).toBe(true);
  });
});
