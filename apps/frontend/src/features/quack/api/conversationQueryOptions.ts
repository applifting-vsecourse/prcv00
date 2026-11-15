import { queryOptions } from "@tanstack/react-query"

import { api, HTTPError } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema, type Quack } from "@/features/quack/api/quackSchemas"

// The conversation `quackId` belongs to: its start and every reply, oldest
// first. null when it no longer exists (everything in it was deleted).
export const conversationQueryOptions = (quackId: string) =>
  queryOptions({
    queryKey: quackKeys.conversation(quackId),
    queryFn: async (): Promise<Quack[] | null> => {
      try {
        const json = await api.get(`quacks/${encodeURIComponent(quackId)}/conversation`).json()
        return quacksSchema.parse(json)
      } catch (error) {
        // Gone is an answer, not a failure: the page says so instead of "retry".
        if (error instanceof HTTPError && error.response.status === 404) return null
        throw error
      }
    },
  })
