import { afterEach, describe, expect, it, vi } from "vitest"

import { deleteQuack } from "@/features/quack/api/deleteQuack"

// Through the real ky client with only the network faked (see CLAUDE.md:
// "Read API error bodies from error.data").
const respondWith = (status: number, body?: unknown) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(body === undefined ? null : JSON.stringify(body), {
          status,
          headers: body === undefined ? {} : { "Content-Type": "application/json" },
        }),
      ),
    ),
  )

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("deleteQuack", () => {
  it("resolves when the quack is deleted", async () => {
    respondWith(204)

    await expect(deleteQuack("q1")).resolves.toBeUndefined()
  })

  it("treats an already deleted quack as done", async () => {
    respondWith(404, { statusCode: 404, message: "Quack q1 not found" })

    await expect(deleteQuack("q1")).resolves.toBeUndefined()
  })

  it.each([
    [403, "Only the author can delete this quack"],
    [500, "Internal server error"],
  ])("fails on %i with the server's message", async (status, message) => {
    respondWith(status, { statusCode: status, message })

    await expect(deleteQuack("q1")).rejects.toThrow(message)
  })
})
