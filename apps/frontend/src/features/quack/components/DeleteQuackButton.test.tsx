import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { deleteQuack } from "@/features/quack/api/deleteQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"
import type { QuacksData } from "@/features/quack/api/quacksQueryOptions"
import { QuackList } from "@/features/quack/components/QuackList"

vi.mock("@/features/quack/api/deleteQuack", () => ({ deleteQuack: vi.fn() }))

const aQuack = (id: string, text: string, userId: string): Quack => ({
  id,
  text,
  mood: null,
  userId,
  createdAt: new Date("2026-10-20T12:00:00Z"),
  user: { id: userId, name: userId, username: userId },
  poll: null,
})

const listKey = quackKeys.list(undefined)

// The feed as the page renders it: from the cached list, so removing the
// quack from the cache shows up as it disappearing from the screen.
function Feed() {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: listKey,
    queryFn: () => queryClient.getQueryData<QuacksData>(listKey) ?? { quacks: [] },
    staleTime: Infinity,
  })
  return (
    <main>
      <h1>Quacks</h1>
      <QuackList
        quacks={data?.quacks ?? []}
        currentUserId="me"
      />
    </main>
  )
}

const renderFeed = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData<QuacksData>(listKey, {
    quacks: [
      aQuack("q1", "my first quack", "me"),
      aQuack("q2", "someone else's quack", "other"),
      aQuack("q3", "my second quack", "me"),
    ],
  })
  render(
    <QueryClientProvider client={queryClient}>
      <Feed />
    </QueryClientProvider>,
  )
}

const deleteButtonOf = (text: string) => {
  const article = screen.getByText(text).closest("article")
  if (!article) throw new Error(`no quack "${text}"`)
  return within(article).getByRole("button", { name: "Delete quack" })
}

const confirm = async (buttonName: "Delete" | "Keep it") => {
  const dialog = await screen.findByRole("alertdialog")
  expect(within(dialog).getByText("Delete this quack?")).toBeInTheDocument()
  await userEvent.click(within(dialog).getByRole("button", { name: buttonName }))
}

beforeEach(() => {
  vi.mocked(deleteQuack).mockReset()
})

describe("Deleting a quack", () => {
  it("offers Delete only on my own quacks", () => {
    renderFeed()

    expect(screen.getAllByRole("button", { name: "Delete quack" })).toHaveLength(2)
    const others = screen.getByText("someone else's quack").closest("article")
    expect(others && within(others).queryByRole("button", { name: "Delete quack" })).toBeNull()
  })

  it("asks first, then removes the quack and moves focus to the next one", async () => {
    vi.mocked(deleteQuack).mockResolvedValue(undefined)
    renderFeed()

    await userEvent.click(deleteButtonOf("my first quack"))
    expect(deleteQuack).not.toHaveBeenCalled()
    await confirm("Delete")

    expect(deleteQuack).toHaveBeenCalledWith("q1")
    await waitFor(() => expect(screen.queryByText("my first quack")).not.toBeInTheDocument())
    expect(screen.getByText("someone else's quack")).toBeInTheDocument()
    // Not dumped back at the top of the page.
    await waitFor(() =>
      expect(screen.getByText("someone else's quack").closest("article")).toHaveFocus(),
    )
  })

  it("changes nothing when I keep it", async () => {
    renderFeed()

    await userEvent.click(deleteButtonOf("my first quack"))
    await confirm("Keep it")

    expect(deleteQuack).not.toHaveBeenCalled()
    expect(screen.getByText("my first quack")).toBeInTheDocument()
  })

  it("keeps the quack and says so when deleting fails", async () => {
    vi.mocked(deleteQuack).mockRejectedValue(new Error("Failed to fetch"))
    renderFeed()

    await userEvent.click(deleteButtonOf("my second quack"))
    await confirm("Delete")

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't delete the quack. Try again.",
    )
    expect(screen.getByText("my second quack")).toBeInTheDocument()
  })
})
