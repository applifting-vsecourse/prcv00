import { describe, expect, it } from "vitest"

import { parseConversationSearch } from "@/features/quack/lib/conversationSearch"

describe("parseConversationSearch", () => {
  it.each([
    [{}, {}],
    [{ reply: "r1" }, { reply: "r1" }],
    [{ compose: true }, { compose: true }],
    [{ compose: "true" }, { compose: true }],
    [{ compose: "yes", reply: "" }, {}],
    [{ reply: 42 }, {}],
  ])("reads %j as %j", (search, expected) => {
    expect(parseConversationSearch(search)).toEqual(expected)
  })
})
