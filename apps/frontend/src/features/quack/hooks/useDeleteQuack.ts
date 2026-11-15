import { useMutation, useQueryClient } from "@tanstack/react-query"

import { deleteQuack } from "@/features/quack/api/deleteQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"
import type { QuacksData } from "@/features/quack/api/quacksQueryOptions"

// What the server leaves of a quack that still has replies (docs/adr/0002).
const toPlaceholder = (quack: Quack): Quack => ({
  ...quack,
  text: null,
  mood: null,
  userId: null,
  user: null,
  poll: null,
  isDeleted: true,
})

export function useDeleteQuack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (quackId: string) => deleteQuack(quackId),
    onSuccess: (_result, quackId) => {
      // Updated in every cached list (the feed and any search) right away,
      // without waiting for the refetch below. The plain feed keeps a
      // conversation start that has replies, as a deleted quack; everywhere
      // else a deleted quack is simply gone.
      queryClient.setQueriesData<QuacksData>({ queryKey: quackKeys.lists() }, (data) => {
        if (!data) return data
        const isPlainFeed = !data.search && !data.isMine && !data.tag
        return {
          ...data,
          quacks: data.quacks.flatMap((quack) => {
            if (quack.id !== quackId) return [quack]
            return isPlainFeed && quack.replyCount > 0 ? [toPlaceholder(quack)] : []
          }),
        }
      })
    },
    // Conversations refetch too: there the quack may stay as a placeholder,
    // or take deleted quacks above it with it.
    onSettled: () => queryClient.invalidateQueries({ queryKey: quackKeys.all() }),
  })
}
