import { afterEach, describe, expect, it, vi } from "vitest"

import { PollClosedError } from "@/features/quack/api/pollErrors"
import { votePoll } from "@/features/quack/api/polls"

// Goes through the real ky client; only the network is faked. Mocking the
// module instead hid that ky consumes the error body before we could read it.
const respondWith = (status: number, body: unknown) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ),
  )

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("votePoll", () => {
  it("returns the poll the server sends back", async () => {
    const poll = {
      id: "p1",
      isClosed: false,
      options: [{ id: "o1", text: "Pizza", votes: 1 }],
      totalVotes: 1,
      myOptionId: "o1",
    }
    respondWith(200, poll)

    await expect(votePoll("p1", "o1")).resolves.toEqual(poll)
  })

  it("says the question was closed when the server refuses with POLL_CLOSED", async () => {
    respondWith(409, {
      statusCode: 409,
      error: "Conflict",
      code: "POLL_CLOSED",
      message: "This question was closed before your vote.",
    })

    await expect(votePoll("p1", "o1")).rejects.toBeInstanceOf(PollClosedError)
  })

  it("passes other failures on with the server's message", async () => {
    respondWith(404, {
      statusCode: 404,
      message: "Answer o9 is not part of this question",
    })

    const error: unknown = await votePoll("p1", "o9").catch((e: unknown) => e)
    expect(error).not.toBeInstanceOf(PollClosedError)
    expect(error).toHaveProperty("message", "Answer o9 is not part of this question")
  })
})
