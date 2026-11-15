import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { CONVERSATION_START } from "@/test/quackFixtures"
import { renderWithRouter } from "@/test/renderWithRouter"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"

vi.mock("@/features/quack/api/polls", () => ({
  votePoll: vi.fn(),
  withdrawVote: vi.fn(),
  closePoll: vi.fn(),
}))

const pollQuack: Quack = {
  id: "q1",
  text: "Lunch?",
  mood: null,
  userId: "author",
  createdAt: new Date("2026-10-18T12:00:00Z"),
  user: { id: "author", name: "Pond Admin", username: "PondAdmin" },
  ...CONVERSATION_START,
  poll: {
    id: "p1",
    isClosed: false,
    options: [
      { id: "o1", text: "Pizza", votes: 2 },
      { id: "o2", text: "Sushi place", votes: 1 },
    ],
    totalVotes: 3,
    myOptionId: null,
  },
}

const renderItem = (props: Omit<Parameters<typeof QuackItem>[0], "quack">) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <QuackItem
        quack={pollQuack}
        {...props}
      />
    </QueryClientProvider>,
  )

describe("QuackItem with a question", () => {
  it("offers 'Close question' to the author", () => {
    renderItem({ currentUserId: "author" })

    expect(screen.getByRole("button", { name: "Close question" })).toBeInTheDocument()
  })

  it.each([
    ["someone else", "someone-else"],
    ["nobody known", undefined],
  ])("doesn't offer it to %s", (_label, currentUserId) => {
    renderItem({ currentUserId })

    expect(screen.queryByRole("button", { name: "Close question" })).not.toBeInTheDocument()
    // They can still vote.
    expect(screen.getByRole("button", { name: /^Pizza/ })).toBeInTheDocument()
  })

  it("shows results but can't be voted on as a read-only preview", () => {
    renderItem({ isReadOnly: true, currentUserId: "author" })

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.getByText("2 votes · 67 %")).toBeInTheDocument()
    expect(screen.getByText("3 votes")).toBeInTheDocument()
  })

  it("highlights a search match inside an answer", () => {
    renderItem({ highlight: "sushi" })

    const sushi = screen.getByRole("button", { name: /^Sushi place/ })
    expect(within(sushi).getByText("Sushi").tagName).toBe("MARK")
  })
})

describe("QuackItem in a list", () => {
  const plain: Quack = { ...pollQuack, poll: null, text: "Who took the bread?" }
  const renderInList = (quack: Quack) =>
    renderWithRouter(
      <QueryClientProvider client={new QueryClient()}>
        <QuackItem
          quack={quack}
          hasConversationLinks
        />
      </QueryClientProvider>,
    )

  it("links a conversation start to its conversation: the reply count and Reply", async () => {
    await renderInList({ ...plain, replyCount: 2 })

    expect(screen.getByRole("link", { name: "2 replies" })).toHaveAttribute("href", "/quacks/q1")
    expect(screen.getByRole("link", { name: "Reply to @PondAdmin" })).toHaveAttribute(
      "href",
      "/quacks/q1?compose=true",
    )
  })

  it("offers only Reply when nobody has replied yet", async () => {
    await renderInList(plain)

    expect(screen.queryByRole("link", { name: /repl(y|ies)$/ })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Reply to @PondAdmin" })).toBeInTheDocument()
  })

  it("says whose conversation a reply is in and links to the reply there", async () => {
    await renderInList({
      ...plain,
      id: "r1",
      parentId: "q0",
      root: { id: "q0", user: { id: "jane", name: "Jane Doe", username: "jane" } },
    })

    expect(screen.getByRole("link", { name: "Reply in a conversation by @jane" })).toHaveAttribute(
      "href",
      "/quacks/q0?reply=r1",
    )
    expect(screen.queryByRole("link", { name: /^Reply to/ })).not.toBeInTheDocument()
  })

  it("says when the quack that started the conversation was deleted", async () => {
    await renderInList({ ...plain, id: "r1", parentId: "q0", root: { id: "q0", user: null } })

    expect(
      screen.getByRole("link", { name: "Reply in a conversation whose quack was deleted" }),
    ).toBeInTheDocument()
  })

  it("shows a deleted conversation start with nothing of it but its replies", async () => {
    await renderInList({
      ...plain,
      text: null,
      user: null,
      userId: null,
      isDeleted: true,
      replyCount: 3,
    })

    expect(screen.getByText("This quack was deleted.")).toBeInTheDocument()
    expect(screen.queryByText("Pond Admin")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "3 replies" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /^Reply/ })).not.toBeInTheDocument()
  })
})
