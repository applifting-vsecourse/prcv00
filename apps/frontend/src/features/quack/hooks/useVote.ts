import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { PollClosedError } from "@/features/quack/api/pollErrors"
import { votePoll, withdrawVote } from "@/features/quack/api/polls"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Poll } from "@/features/quack/api/quackSchemas"
import type { QuacksData } from "@/features/quack/api/quacksQueryOptions"
import { applyVote } from "@/features/quack/lib/pollMath"

// The same poll can sit in several cached lists (the full feed and searches),
// so every change is written into all of them.
export function setPollInFeed(
  queryClient: QueryClient,
  pollId: string,
  update: (poll: Poll) => Poll,
) {
  queryClient.setQueriesData<QuacksData>({ queryKey: quackKeys.lists() }, (data) =>
    data
      ? {
          ...data,
          quacks: data.quacks.map((quack) =>
            quack.poll?.id === pollId ? { ...quack, poll: update(quack.poll) } : quack,
          ),
        }
      : data,
  )
}

const voteKey = (pollId: string) => ["poll-vote", pollId] as const

export const voteErrorMessage = (error: Error) =>
  error instanceof PollClosedError ? error.message : "Your vote didn't go through. Try again."

// optionId: the answer to vote for, or null to take the vote back.
export function useVote(pollId: string) {
  const queryClient = useQueryClient()
  // Callbacks run while their own mutation still counts as pending, so 1 means
  // "no later click on this poll is waiting".
  const isLastVote = () => queryClient.isMutating({ mutationKey: voteKey(pollId) }) === 1

  return useMutation({
    mutationKey: voteKey(pollId),
    // Mutations sharing a scope run one at a time, in click order: quick
    // clicks reach the server in the order made, so the last one wins there
    // too. onMutate still runs at once for each click, so every click shows.
    scope: { id: `poll-vote:${pollId}` },
    mutationFn: (optionId: string | null) =>
      optionId ? votePoll(pollId, optionId) : withdrawVote(pollId),
    onMutate: async (optionId) => {
      await queryClient.cancelQueries({ queryKey: quackKeys.lists() })
      const snapshot = queryClient.getQueriesData<QuacksData>({ queryKey: quackKeys.lists() })
      setPollInFeed(queryClient, pollId, (poll) => applyVote(poll, optionId))
      return { snapshot }
    },
    onError: (error, _optionId, context) => {
      // Back to how it was before this click. If a later click is queued, its
      // own result (or the refetch below) decides what is shown instead.
      if (context && isLastVote()) {
        for (const [queryKey, data] of context.snapshot) queryClient.setQueryData(queryKey, data)
      }
      // The server says it's closed: show it closed now, not only once the
      // refetch lands, which may be slow or fail on the same flaky network.
      if (error instanceof PollClosedError) {
        setPollInFeed(queryClient, pollId, (poll) => ({ ...poll, isClosed: true }))
      }
    },
    onSuccess: (poll) => {
      if (isLastVote()) setPollInFeed(queryClient, pollId, () => poll)
    },
    onSettled: async () => {
      // Refetching after an earlier click would overwrite the optimistic
      // state of a later one and make the numbers flicker; wait for the last.
      if (isLastVote()) await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}
