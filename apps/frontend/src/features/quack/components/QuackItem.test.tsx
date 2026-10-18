import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

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
