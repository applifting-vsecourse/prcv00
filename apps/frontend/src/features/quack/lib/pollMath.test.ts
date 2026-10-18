import { describe, expect, it } from "vitest"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { applyVote, pollPercentages } from "@/features/quack/lib/pollMath"

describe("pollPercentages", () => {
  it.each([
    [
      [1, 1, 1],
      [34, 33, 33],
    ],
    [
      [3, 2],
      [60, 40],
    ],
    [
      [1, 0],
      [100, 0],
    ],
    [
      [2, 1],
      [67, 33],
    ],
    [
      [1, 1, 1, 1, 1, 1],
      [17, 17, 17, 17, 16, 16],
    ],
    [
      [0, 5, 0],
      [0, 100, 0],
    ],
  ])("turns %j votes into %j %%", (votes, expected) => {
    expect(pollPercentages(votes)).toEqual(expected)
  })

  it.each([[[1, 1, 1]], [[1, 2, 4]], [[7, 3, 3, 1]], [[1, 1, 1, 1, 1, 1]], [[99, 1, 1]]])(
    "always adds up to exactly 100 for %j",
    (votes) => {
      expect(pollPercentages(votes)?.reduce((a, b) => a + b, 0)).toBe(100)
    },
  )

  it("has no percentages before anyone votes", () => {
    expect(pollPercentages([0, 0, 0])).toBeNull()
  })
})

const poll = (overrides: Partial<Poll> = {}): Poll => ({
  id: "p1",
  isClosed: false,
  options: [
    { id: "o1", text: "Pizza", votes: 2 },
    { id: "o2", text: "Sushi", votes: 1 },
  ],
  totalVotes: 3,
  myOptionId: null,
  ...overrides,
})

const counts = (p: Poll) => p.options.map((option) => option.votes)

describe("applyVote", () => {
  it("adds a first vote", () => {
    const result = applyVote(poll(), "o2")
    expect(counts(result)).toEqual([2, 2])
    expect(result.totalVotes).toBe(4)
    expect(result.myOptionId).toBe("o2")
  })

  it("moves a vote without counting it twice", () => {
    const result = applyVote(poll({ myOptionId: "o1" }), "o2")
    expect(counts(result)).toEqual([1, 2])
    expect(result.totalVotes).toBe(3)
  })

  it("takes a vote back", () => {
    const result = applyVote(poll({ myOptionId: "o1" }), null)
    expect(counts(result)).toEqual([1, 1])
    expect(result.totalVotes).toBe(2)
    expect(result.myOptionId).toBeNull()
  })
})
