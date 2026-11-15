import { describe, expect, it } from "vitest"

import { parseTagFilter, splitHashtags } from "@/features/quack/lib/hashtags"

// The tags a quack is filed under, as the backend's extractHashtags returns
// them: normalized, each once, in order.
const tagsIn = (text: string) => [
  ...new Set(splitHashtags(text).flatMap((segment) => (segment.tag ? [segment.tag] : []))),
]

describe("splitHashtags", () => {
  // The same cases as the backend's hashtag.spec.ts. Add a case to both.
  it.each([
    ["no hashtag here", []],
    ["#vse", ["vse"]],
    ["Ahoj #vse!", ["vse"]],
    ["#vse, #pond.", ["vse", "pond"]],
    ["(#vse)", ["vse"]],
    ["line one\n#vse", ["vse"]],
    ["#snake_case", ["snake_case"]],
    ["#VSE and #vse", ["vse"]],
    ["#b then #a then #b", ["b", "a"]],
    ["#čeština #Žluťoučký", ["čeština", "žluťoučký"]],
    ["#vše #vse", ["vše", "vse"]],
    ["#2026vse", ["2026vse"]],
    ["#1 and #2026", []],
    ["#", []],
    ["# vse", []],
    ["a#b", []],
    ["##vse", []],
    ["example.com/#top", []],
    ["#vse-a", ["vse"]],
  ])("finds the hashtags in %j", (text, expected) => {
    expect(tagsIn(text)).toEqual(expected)
  })

  it("treats a decomposed accent like a composed one", () => {
    expect(tagsIn("#café")).toEqual(["café"])
  })

  it("keeps the text around the tags, and the tag as it was written", () => {
    expect(splitHashtags("Exam at #VSE, then #pond")).toEqual([
      { text: "Exam at " },
      { text: "#VSE", tag: "vse" },
      { text: ", then " },
      { text: "#pond", tag: "pond" },
    ])
  })

  it("returns text without tags as one piece", () => {
    expect(splitHashtags("#1 duck")).toEqual([{ text: "#1 duck" }])
  })
})

describe("parseTagFilter", () => {
  it.each([
    ["vse", "vse"],
    ["#vse", "vse"],
    [" VSE ", "vse"],
    ["Čeština", "čeština"],
  ])("reads %j as %j", (input, expected) => {
    expect(parseTagFilter(input, 100)).toBe(expected)
  })

  it.each(["", "  ", "#", "##vse", "two words", "a-b", "2026", "a".repeat(101)])(
    "drops %j",
    (input) => {
      expect(parseTagFilter(input, 100)).toBeUndefined()
    },
  )
})
