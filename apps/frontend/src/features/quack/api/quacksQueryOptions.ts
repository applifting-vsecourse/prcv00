import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"

export const quacksQueryOptions = (search?: string) =>
  queryOptions({
    queryKey: quackKeys.list(search),
    queryFn: async () => {
      const searchParams = search ? { q: search } : undefined
      const quacks = quacksSchema.parse(await api.get("quacks", { searchParams }).json())
      // The term travels with its results: while the next search loads, the
      // previous results stay on screen (placeholderData) and must keep their
      // own count and highlights rather than the term still being fetched.
      return { search, quacks }
    },
    placeholderData: keepPreviousData,
  })
