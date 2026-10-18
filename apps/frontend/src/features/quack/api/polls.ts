import { api, HTTPError } from "@/lib/api-client"

import { PollClosedError } from "@/features/quack/api/pollErrors"
import { pollSchema, type Poll } from "@/features/quack/api/quackSchemas"

// Matches POLL_CLOSED_CODE in the backend's polls controller.
const POLL_CLOSED_CODE = "POLL_CLOSED"

const pollPath = (pollId: string, action: "vote" | "close") =>
  `polls/${encodeURIComponent(pollId)}/${action}`

// ky has already read the error body into `error.data` (the response body
// itself can't be read again), so the code is looked up there.
function asPollError(error: unknown): unknown {
  if (error instanceof HTTPError && error.response.status === 409) {
    const body = error.data as { code?: unknown } | undefined
    if (body?.code === POLL_CLOSED_CODE) return new PollClosedError()
  }
  return error
}

async function request(send: () => Promise<unknown>): Promise<Poll> {
  try {
    return pollSchema.parse(await send())
  } catch (error) {
    throw asPollError(error)
  }
}

export const votePoll = (pollId: string, optionId: string): Promise<Poll> =>
  request(() => api.put(pollPath(pollId, "vote"), { json: { optionId } }).json())

export const withdrawVote = (pollId: string): Promise<Poll> =>
  request(() => api.delete(pollPath(pollId, "vote")).json())

export const closePoll = (pollId: string): Promise<Poll> =>
  request(() => api.post(pollPath(pollId, "close")).json())
