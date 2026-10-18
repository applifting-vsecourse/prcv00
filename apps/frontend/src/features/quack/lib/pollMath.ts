import type { Poll } from "@/features/quack/api/quackSchemas"

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

// Whole percentages that always add up to exactly 100 (largest remainder):
// three equal answers read 34 %, 33 %, 33 % — never 33 % three times, which
// people read as "the numbers are wrong". Null when nobody has voted.
export function pollPercentages(votes: number[]): number[] | null {
  const total = sum(votes)
  if (total === 0) return null

  const exact = votes.map((count) => (count * 100) / total)
  const result = exact.map(Math.floor)
  const leftover = 100 - sum(result)

  // The answers closest to the next whole number get the leftover points;
  // ties go to the earlier answer, so the result doesn't jump around.
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (const { index } of byRemainder.slice(0, leftover)) {
    result[index] = (result[index] ?? 0) + 1
  }
  return result
}

// The poll as it will look once my vote — or taking it back (null) — lands.
// Used to show the change straight away, before the server answers.
export function applyVote(poll: Poll, optionId: string | null): Poll {
  const options = poll.options.map((option) => ({
    ...option,
    votes:
      option.votes - (option.id === poll.myOptionId ? 1 : 0) + (option.id === optionId ? 1 : 0),
  }))
  return {
    ...poll,
    options,
    myOptionId: optionId,
    totalVotes: sum(options.map((option) => option.votes)),
  }
}
