import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PollClosedError } from "@/features/quack/api/pollErrors"
import { closePoll, votePoll, withdrawVote } from "@/features/quack/api/polls"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Poll, Quack } from "@/features/quack/api/quackSchemas"
import { QuackPoll } from "@/features/quack/components/QuackPoll"

vi.mock("@/features/quack/api/polls", () => ({
  votePoll: vi.fn(),
  withdrawVote: vi.fn(),
  closePoll: vi.fn(),
}))

const aPoll = (overrides: Partial<Poll> = {}): Poll => ({
  id: "p1",
  isClosed: false,
  options: [
    { id: "o1", text: "Pizza", votes: 2 },
    { id: "o2", text: "Sushi", votes: 1 },
  ],
  totalVotes: 3,
  myOptionId: null,
  ...overrides,
})

const listKey = quackKeys.list(undefined)

// Renders the poll the way the feed does: from the cached quack list, so the
// optimistic update, rollback and server answer all show up in the UI.
function FeedPoll({ isAuthor }: { isAuthor: boolean }) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: listKey,
    // A "refetch" returns whatever the cache holds by then.
    queryFn: () => queryClient.getQueryData<{ quacks: Quack[] }>(listKey) ?? { quacks: [] },
    staleTime: Infinity,
  })
  const poll = data?.quacks[0]?.poll
  return poll ? (
    <QuackPoll
      poll={poll}
      isAuthor={isAuthor}
    />
  ) : null
}

const renderPoll = (poll: Poll, { isAuthor = false } = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const quack: Quack = {
    id: "q1",
    text: "Lunch?",
    mood: null,
    userId: "author",
    createdAt: new Date("2026-10-18T12:00:00Z"),
    user: { id: "author", name: "Pond Admin", username: "PondAdmin" },
    poll,
  }
  queryClient.setQueryData(listKey, { search: undefined, quacks: [quack] })
  render(
    <QueryClientProvider client={queryClient}>
      <FeedPoll isAuthor={isAuthor} />
    </QueryClientProvider>,
  )
}

// A promise the test settles by hand, to look at the UI mid-request.
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined
  let reject: (error: Error) => void = () => undefined
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const answer = (text: string) => screen.getByRole("button", { name: new RegExp(`^${text}`) })

beforeEach(() => {
  vi.mocked(votePoll).mockReset()
  vi.mocked(withdrawVote).mockReset()
  vi.mocked(closePoll).mockReset()
})

describe("QuackPoll", () => {
  it("shows each answer's votes and percentage, and the total", () => {
    renderPoll(aPoll())

    expect(answer("Pizza")).toHaveTextContent("2 votes · 67 %")
    expect(answer("Sushi")).toHaveTextContent("1 vote · 33 %")
    expect(screen.getByText("3 votes")).toBeInTheDocument()
  })

  it("says 'No votes yet' and shows no percentages before anyone votes", () => {
    renderPoll(
      aPoll({
        options: [
          { id: "o1", text: "Pizza", votes: 0 },
          { id: "o2", text: "Sushi", votes: 0 },
        ],
        totalVotes: 0,
      }),
    )

    expect(screen.getByText("No votes yet")).toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it("shows my vote straight away, before the server answers", async () => {
    const request = deferred<Poll>()
    vi.mocked(votePoll).mockReturnValue(request.promise)
    renderPoll(aPoll())

    await userEvent.click(answer("Sushi"))

    expect(answer("Sushi")).toHaveAttribute("aria-pressed", "true")
    expect(answer("Sushi")).toHaveTextContent("2 votes · 50 %")
    expect(screen.getByText("4 votes")).toBeInTheDocument()
    expect(votePoll).toHaveBeenCalledWith("p1", "o2")

    request.resolve(aPoll({ myOptionId: "o2" }))
  })

  it("goes back to how it was and says so when a vote fails", async () => {
    vi.mocked(votePoll).mockRejectedValue(new Error("Failed to fetch"))
    renderPoll(aPoll())

    await userEvent.click(answer("Sushi"))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your vote didn't go through. Try again.",
    )
    expect(answer("Sushi")).toHaveAttribute("aria-pressed", "false")
    expect(answer("Sushi")).toHaveTextContent("1 vote · 33 %")
    expect(screen.getByText("3 votes")).toBeInTheDocument()
  })

  it("says the question was closed when the vote arrived too late", async () => {
    vi.mocked(votePoll).mockRejectedValue(new PollClosedError())
    renderPoll(aPoll())

    await userEvent.click(answer("Sushi"))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This question was closed before your vote.",
    )
    // Shown closed straight away — the harness's "refetch" only returns the
    // cache, so this can't be the refetch's doing.
    expect(screen.getByText("Closed")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Pizza/ })).not.toBeInTheDocument()
    expect(screen.getByText("3 votes")).toBeInTheDocument()
  })

  describe("quick clicks where one fails", () => {
    it("ends on the first answer when the second click fails", async () => {
      const first = deferred<Poll>()
      vi.mocked(votePoll)
        .mockReturnValueOnce(first.promise)
        .mockRejectedValueOnce(new Error("Failed to fetch"))
      renderPoll(aPoll())

      await userEvent.click(answer("Pizza"))
      await userEvent.click(answer("Sushi"))
      first.resolve(
        aPoll({
          options: [
            { id: "o1", text: "Pizza", votes: 3 },
            { id: "o2", text: "Sushi", votes: 1 },
          ],
          totalVotes: 4,
          myOptionId: "o1",
        }),
      )

      expect(await screen.findByRole("alert")).toHaveTextContent("Your vote didn't go through.")
      expect(answer("Pizza")).toHaveAttribute("aria-pressed", "true")
      expect(answer("Sushi")).toHaveAttribute("aria-pressed", "false")
      expect(screen.getByText("4 votes")).toBeInTheDocument()
    })

    it("doesn't flick back when the first fails but the second goes through", async () => {
      const first = deferred<Poll>()
      const second = deferred<Poll>()
      vi.mocked(votePoll).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      renderPoll(aPoll())

      await userEvent.click(answer("Pizza"))
      await userEvent.click(answer("Sushi"))
      first.reject(new Error("Failed to fetch"))
      await waitFor(() => expect(votePoll).toHaveBeenCalledTimes(2))

      // The failed first click doesn't restore its snapshot over the second.
      expect(answer("Sushi")).toHaveAttribute("aria-pressed", "true")

      second.resolve(aPoll({ myOptionId: "o2" }))
      await waitFor(() => expect(votePoll).toHaveBeenCalledTimes(2))
      expect(answer("Sushi")).toHaveAttribute("aria-pressed", "true")
    })
  })

  it("takes my vote back when I click my own answer again", async () => {
    vi.mocked(withdrawVote).mockResolvedValue(
      aPoll({
        options: [
          { id: "o1", text: "Pizza", votes: 1 },
          { id: "o2", text: "Sushi", votes: 1 },
        ],
        totalVotes: 2,
      }),
    )
    renderPoll(aPoll({ myOptionId: "o1" }))

    await userEvent.click(answer("Pizza"))

    expect(withdrawVote).toHaveBeenCalledWith("p1")
    expect(votePoll).not.toHaveBeenCalled()
    await waitFor(() => expect(answer("Pizza")).toHaveAttribute("aria-pressed", "false"))
    expect(screen.getByText("2 votes")).toBeInTheDocument()
  })

  it("sends quick clicks one after another, so the last one counts", async () => {
    const first = deferred<Poll>()
    const second = deferred<Poll>()
    vi.mocked(votePoll).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    renderPoll(aPoll())

    await userEvent.click(answer("Pizza"))
    await userEvent.click(answer("Sushi"))

    // Both clicks show at once…
    expect(answer("Sushi")).toHaveAttribute("aria-pressed", "true")
    expect(answer("Pizza")).toHaveAttribute("aria-pressed", "false")
    // …but the second request waits for the first.
    expect(votePoll).toHaveBeenCalledTimes(1)

    first.resolve(aPoll({ myOptionId: "o1" }))
    await waitFor(() => expect(votePoll).toHaveBeenCalledTimes(2))
    expect(vi.mocked(votePoll).mock.calls).toEqual([
      ["p1", "o1"],
      ["p1", "o2"],
    ])
    // The first answer coming back doesn't undo the second click.
    expect(answer("Sushi")).toHaveAttribute("aria-pressed", "true")

    second.resolve(
      aPoll({
        options: [
          { id: "o1", text: "Pizza", votes: 2 },
          { id: "o2", text: "Sushi", votes: 2 },
        ],
        totalVotes: 4,
        myOptionId: "o2",
      }),
    )
    await waitFor(() => expect(screen.getByText("4 votes")).toBeInTheDocument())
    expect(answer("Sushi")).toHaveAttribute("aria-pressed", "true")
  })

  it("can't be voted on once closed, and still shows my answer", () => {
    renderPoll(aPoll({ isClosed: true, myOptionId: "o1" }))

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.getByText("Closed")).toBeInTheDocument()
    expect(screen.getByText("(your answer)")).toBeInTheDocument()
  })

  describe("closing", () => {
    it("is offered only to the author", () => {
      renderPoll(aPoll(), { isAuthor: false })

      expect(screen.queryByRole("button", { name: "Close question" })).not.toBeInTheDocument()
    })

    it("asks first, then closes for good", async () => {
      vi.mocked(closePoll).mockResolvedValue(aPoll({ isClosed: true }))
      renderPoll(aPoll(), { isAuthor: true })

      await userEvent.click(screen.getByRole("button", { name: "Close question" }))
      const dialog = await screen.findByRole("alertdialog")
      expect(within(dialog).getByText("Are you sure?")).toBeInTheDocument()
      expect(closePoll).not.toHaveBeenCalled()

      await userEvent.click(within(dialog).getByRole("button", { name: "Close question" }))

      expect(closePoll).toHaveBeenCalledWith("p1")
      expect(await screen.findByText("Closed")).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /Pizza/ })).not.toBeInTheDocument()
      // The button focus would return to is gone; focus lands on the question.
      await waitFor(() => expect(screen.getByRole("group", { name: "Answers" })).toHaveFocus())
    })

    it("keeps it open when the author changes their mind", async () => {
      renderPoll(aPoll(), { isAuthor: true })

      await userEvent.click(screen.getByRole("button", { name: "Close question" }))
      await userEvent.click(await screen.findByRole("button", { name: "Keep it open" }))

      expect(closePoll).not.toHaveBeenCalled()
      expect(answer("Pizza")).toBeInTheDocument()
    })

    const closeIt = async () => {
      await userEvent.click(screen.getByRole("button", { name: "Close question" }))
      const dialog = await screen.findByRole("alertdialog")
      await userEvent.click(within(dialog).getByRole("button", { name: "Close question" }))
    }

    it("says so when closing fails, and stays open", async () => {
      vi.mocked(closePoll).mockRejectedValue(new Error("Failed to fetch"))
      renderPoll(aPoll(), { isAuthor: true })

      await closeIt()

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Couldn't close the question. Try again.",
      )
      expect(answer("Pizza")).toBeInTheDocument()
    })

    it("shows it closed, without an error, when another tab closed it first", async () => {
      vi.mocked(closePoll).mockRejectedValue(new PollClosedError())
      renderPoll(aPoll(), { isAuthor: true })

      await closeIt()

      expect(await screen.findByText("Closed")).toBeInTheDocument()
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("drops an earlier vote error once the question is closed", async () => {
      vi.mocked(votePoll).mockRejectedValue(new Error("Failed to fetch"))
      vi.mocked(closePoll).mockResolvedValue(aPoll({ isClosed: true }))
      renderPoll(aPoll(), { isAuthor: true })
      await userEvent.click(answer("Sushi"))
      await screen.findByRole("alert")

      await closeIt()

      expect(await screen.findByText("Closed")).toBeInTheDocument()
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("shows the close failure, not an older vote error", async () => {
      vi.mocked(votePoll).mockRejectedValue(new Error("Failed to fetch"))
      vi.mocked(closePoll).mockRejectedValue(new Error("Failed to fetch"))
      renderPoll(aPoll(), { isAuthor: true })
      await userEvent.click(answer("Sushi"))
      await screen.findByRole("alert")

      await closeIt()

      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Couldn't close the question. Try again.",
        ),
      )
    })
  })
})
