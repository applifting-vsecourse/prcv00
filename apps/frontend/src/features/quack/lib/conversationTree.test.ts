import { describe, expect, it } from "vitest"

import { CONVERSATION_START } from "@/test/quackFixtures"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { buildConversationTree } from "@/features/quack/lib/conversationTree"

const aQuack = (id: string, parentId: string | null = null): Quack => ({
  id,
  text: id,
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-11-15T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
  ...CONVERSATION_START,
  parentId,
  root: parentId ? { id: "root", user: null } : null,
})

const shape = (node: ReturnType<typeof buildConversationTree>): unknown =>
  node ? { [node.quack.id]: node.replies.map(shape) } : undefined

describe("buildConversationTree", () => {
  it("hangs every reply under the one it answers, keeping the order it came in", () => {
    const tree = buildConversationTree([
      aQuack("root"),
      aQuack("a", "root"),
      aQuack("b", "root"),
      aQuack("a1", "a"),
      aQuack("a1x", "a1"),
      aQuack("a2", "a"),
    ])

    expect(shape(tree)).toEqual({
      root: [{ a: [{ a1: [{ a1x: [] }] }, { a2: [] }] }, { b: [] }],
    })
  })

  it("returns just the start for a conversation without replies", () => {
    expect(shape(buildConversationTree([aQuack("root")]))).toEqual({ root: [] })
  })

  it("returns nothing when no quack starts the conversation", () => {
    expect(buildConversationTree([])).toBeUndefined()
  })
})
