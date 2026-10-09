import { describe, expect, it } from "vitest"

import { parseQuacksSearch, SEARCH_MAX_LENGTH, toMatchTerm } from "@/features/quack/lib/quackSearch"

describe("parseQuacksSearch", () => {
  it("keeps a search term", () => {
    expect(parseQuacksSearch({ q: "duck" })).toEqual({ q: "duck" })
  })

  it.each([{}, { q: "" }, { q: "   " }, { q: null }, { q: { nested: 1 } }])(
    "treats %j as no search",
    (search) => {
      expect(parseQuacksSearch(search)).toEqual({})
    },
  )

  it("accepts terms the router parsed as numbers or booleans", () => {
    expect(parseQuacksSearch({ q: 2026 })).toEqual({ q: "2026" })
    expect(parseQuacksSearch({ q: true })).toEqual({ q: "true" })
  })

  it("cuts an over-long term from a link to the first 100 characters", () => {
    const long = "a".repeat(SEARCH_MAX_LENGTH) + "b".repeat(50)
    expect(parseQuacksSearch({ q: long })).toEqual({ q: "a".repeat(SEARCH_MAX_LENGTH) })
  })
})

describe("toMatchTerm", () => {
  it.each([
    ["duck", "duck"],
    ["  duck ", "duck"],
    ["@alice", "alice"],
    ["@", ""],
  ])("turns %j into %j", (input, expected) => {
    expect(toMatchTerm(input)).toBe(expected)
  })
})
