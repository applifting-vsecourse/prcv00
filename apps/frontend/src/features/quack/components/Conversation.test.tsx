import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CONVERSATION_START } from "@/test/quackFixtures"

import { addQuack } from "@/features/quack/api/addQuack"
import type { Quack, QuackUser } from "@/features/quack/api/quackSchemas"
import { Conversation } from "@/features/quack/components/Conversation"
import { buildConversationTree } from "@/features/quack/lib/conversationTree"

vi.mock("@/features/quack/api/addQuack", () => ({ addQuack: vi.fn() }))

const jane: QuackUser = { id: "jane", name: "Jane Doe", username: "jane" }
const bob: QuackUser = { id: "bob", name: "Bob Duck", username: "bob" }

const aQuack = (
  id: string,
  text: string | null,
  user: QuackUser | null,
  parent?: Quack,
): Quack => ({
  id,
  text,
  mood: null,
  userId: user?.id ?? null,
  createdAt: new Date("2026-11-15T12:00:00Z"),
  user,
  poll: null,
  ...CONVERSATION_START,
  isDeleted: user === null,
  parentId: parent?.id ?? null,
  root: parent ? { id: "root", user: jane } : null,
  replyTo: parent?.user ?? null,
})

const root = aQuack("root", "Who took the bread?", jane)
const first = aQuack("r1", "Not me", bob, root)
const nested = aQuack("r2", "You did, bob", jane, first)
const second = aQuack("r3", "The swan", bob, root)

const renderConversation = (quacks: Quack[], props: { highlightId?: string } = {}) => {
  const tree = buildConversationTree(quacks)
  if (!tree) throw new Error("no conversation start")
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Conversation
        root={tree}
        currentUserId="bob"
        {...props}
      />
    </QueryClientProvider>,
  )
}

const articleOf = (text: string) => {
  const article = screen.getByText(text).closest("article")
  if (!article) throw new Error(`no quack "${text}"`)
  return article
}

beforeEach(() => {
  vi.mocked(addQuack).mockReset()
  // jsdom lays nothing out, so it has no scrolling to offer.
  Element.prototype.scrollIntoView = vi.fn()
})

describe("Conversation", () => {
  it("shows each reply under the one it answers, oldest first, saying whom it answers", () => {
    renderConversation([root, first, nested, second])

    const texts = screen.getAllByRole("article").map((article) => article.textContent)
    expect(texts.map((text) => /Who took|Not me|You did|The swan/.exec(text)?.[0])).toEqual([
      "Who took",
      "Not me",
      "You did",
      "The swan",
    ])
    expect(within(articleOf("You did, bob")).getByText("in reply to @bob")).toBeInTheDocument()
    expect(within(articleOf("Not me")).getByText("in reply to @jane")).toBeInTheDocument()
    // "You did, bob" sits inside the list of replies to "Not me".
    expect(articleOf("Not me").closest("li")).toContainElement(articleOf("You did, bob"))
  })

  it("shows a deleted quack as an empty marker that can't be replied to or deleted", () => {
    const deleted = aQuack("r1", null, null, root)
    renderConversation([root, deleted, { ...nested, replyTo: null }])

    const marker = screen.getByText("This quack was deleted.").closest("article")
    expect(marker).not.toBeNull()
    expect(within(marker!).queryByRole("button")).toBeNull()
    expect(screen.getByText("in reply to a deleted quack")).toBeInTheDocument()
  })

  it("always has a reply box under the quack that starts it", () => {
    renderConversation([root])

    expect(screen.getByRole("textbox", { name: "Reply to @jane" })).toBeInTheDocument()
    expect(screen.getByText("No replies yet. Be the first.")).toBeInTheDocument()
  })

  it("has no reply box when the quack that starts it was deleted", () => {
    renderConversation([aQuack("root", null, null), { ...first, replyTo: null }])

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    expect(screen.getByText("Not me")).toBeInTheDocument()
  })

  it("replies to a reply in a box under it, sending only the text and the parent", async () => {
    vi.mocked(addQuack).mockResolvedValue(aQuack("r4", "Prove it", jane, first))
    renderConversation([root, first])

    await userEvent.click(
      within(articleOf("Not me")).getByRole("button", { name: "Reply to @bob" }),
    )
    const box = screen.getByRole("textbox", { name: "Reply to @bob" })
    expect(box).toHaveFocus()
    await userEvent.type(box, "Prove it")
    await userEvent.click(screen.getAllByRole("button", { name: "Reply" }).at(-1)!)

    await waitFor(() => expect(addQuack).toHaveBeenCalledOnce())
    expect(vi.mocked(addQuack).mock.calls[0]?.[0]).toEqual({
      text: "Prove it",
      mood: null,
      poll: null,
      parentId: "r1",
    })
    // The box under the reply closes; the one under the start stays.
    await waitFor(() =>
      expect(screen.queryByRole("textbox", { name: "Reply to @bob" })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole("textbox", { name: "Reply to @jane" })).toBeInTheDocument()
  })

  it("refuses an empty reply without sending it", async () => {
    renderConversation([root])

    await userEvent.click(screen.getByRole("button", { name: "Reply" }))

    expect(await screen.findByText("Write something first")).toBeInTheDocument()
    expect(addQuack).not.toHaveBeenCalled()
  })

  it("highlights the reply a link pointed at and moves the focus there", () => {
    renderConversation([root, first, second], { highlightId: "r3" })

    expect(articleOf("The swan")).toHaveClass("bg-secondary")
    expect(articleOf("The swan")).toHaveFocus()
    expect(articleOf("Not me")).not.toHaveClass("bg-secondary")
  })
})
