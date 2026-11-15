import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema, type Quack } from "@/features/quack/api/quackSchemas"

// What a quack list query holds. Poll votes update these entries in place
// (useVote), so the shape is named once here rather than copied there.
export type QuacksData = { search?: string; isMine?: boolean; tag?: string; quacks: Quack[] }

// isMine: only the signed-in user's quacks (the Mine tab).
// tag: only quacks with this hashtag ("vse", no "#").
export const quacksQueryOptions = (search?: string, isMine = false, tag?: string) =>
  queryOptions({
    queryKey: quackKeys.list(search, isMine, tag),
    queryFn: async (): Promise<QuacksData> => {
      const searchParams = {
        ...(search ? { q: search } : {}),
        ...(isMine ? { mine: "true" } : {}),
        ...(tag ? { tag } : {}),
      }
      const quacks = quacksSchema.parse(await api.get("quacks", { searchParams }).json())
      // The term, tab and tag travel with their results: while the next list
      // loads, the previous results stay on screen (placeholderData) and must
      // keep their own count, highlights and empty state, not those being fetched.
      return { search, isMine, tag, quacks }
    },
    placeholderData: keepPreviousData,
  })
