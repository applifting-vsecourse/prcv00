import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"

// Through the real ky client with only the network faked, so the test sees
// the request exactly as the server would.
const stubFetch = () => {
  const fetchMock = vi.fn((input: Request) => {
    void input
    return Promise.resolve(
      new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }),
    )
  })
  vi.stubGlobal("fetch", fetchMock)
  return () => new URL(fetchMock.mock.calls[0]?.[0].url ?? "http://none").searchParams
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("quacksQueryOptions", () => {
  it("asks for everyone's quacks on All", async () => {
    const params = stubFetch()

    await new QueryClient().fetchQuery(quacksQueryOptions(undefined))

    expect(params().has("mine")).toBe(false)
    expect(params().has("q")).toBe(false)
  })

  it("asks for only mine on Mine, together with the search", async () => {
    const params = stubFetch()

    const data = await new QueryClient().fetchQuery(quacksQueryOptions("duck", true))

    expect(params().get("mine")).toBe("true")
    expect(params().get("q")).toBe("duck")
    // The tab travels with its results, like the search term.
    expect(data).toEqual({ search: "duck", isMine: true, quacks: [] })
  })

  it("keeps the two tabs in separate cache entries", () => {
    expect(quacksQueryOptions("duck", true).queryKey).not.toEqual(
      quacksQueryOptions("duck", false).queryKey,
    )
  })
})
