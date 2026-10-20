import { useMutation, useQueryClient } from "@tanstack/react-query"

import { deleteQuack } from "@/features/quack/api/deleteQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { QuacksData } from "@/features/quack/api/quacksQueryOptions"

export function useDeleteQuack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (quackId: string) => deleteQuack(quackId),
    onSuccess: (_result, quackId) => {
      // Gone from every cached list (the feed and any search) right away,
      // without waiting for the refetch below.
      queryClient.setQueriesData<QuacksData>({ queryKey: quackKeys.lists() }, (data) =>
        data ? { ...data, quacks: data.quacks.filter((quack) => quack.id !== quackId) } : data,
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: quackKeys.all() }),
  })
}
