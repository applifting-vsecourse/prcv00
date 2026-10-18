import { useMutation, useQueryClient } from "@tanstack/react-query"

import { PollClosedError } from "@/features/quack/api/pollErrors"
import { closePoll } from "@/features/quack/api/polls"
import { quackKeys } from "@/features/quack/api/quackKeys"
import { setPollInFeed } from "@/features/quack/hooks/useVote"

export const closeErrorMessage = "Couldn't close the question. Try again."

export function useClosePoll(pollId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => closePoll(pollId),
    onSuccess: (poll) => setPollInFeed(queryClient, pollId, () => poll),
    onError: (error) => {
      // Already closed (from another tab): that's what the author wanted.
      if (error instanceof PollClosedError) {
        setPollInFeed(queryClient, pollId, (poll) => ({ ...poll, isClosed: true }))
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: quackKeys.all() }),
  })
}
