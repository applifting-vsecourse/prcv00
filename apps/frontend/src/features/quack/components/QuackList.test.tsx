// Example component test — the pattern to copy for your own components.
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackList } from "@/features/quack/components/QuackList"

const quack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "quack quack",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  ...overrides,
})

describe("QuackList", () => {
  it("renders quacks with author info", () => {
    render(<QuackList quacks={[quack()]} />)

    expect(screen.getByText("quack quack")).toBeInTheDocument()
    expect(screen.getByText("Caffeinated Duck")).toBeInTheDocument()
    expect(screen.getByText("@CaffeinatedDuck")).toBeInTheDocument()
  })

  it("shows the mood of a quack that has one", () => {
    render(<QuackList quacks={[quack({ mood: "silly" })]} />)

    expect(screen.getByText("Silly")).toBeInTheDocument()
  })

  it("shows no mood for a quack without one", () => {
    render(<QuackList quacks={[quack()]} />)

    for (const label of ["Happy", "Sad", "Angry", "Silly"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })

  it("shows an error with a working reload button", async () => {
    const onReload = vi.fn()
    render(
      <QuackList
        quacks={[]}
        error={new Error("Server unreachable")}
        onReload={onReload}
      />,
    )

    expect(screen.getByText("Couldn't load quacks")).toBeInTheDocument()
    expect(screen.getByText("Server unreachable")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /reload/i }))
    expect(onReload).toHaveBeenCalledOnce()
  })

  describe("while searching", () => {
    it("shows the result count (AC14)", () => {
      const { rerender } = render(
        <QuackList
          quacks={[quack()]}
          search="quack"
        />,
      )
      expect(screen.getByText("1 quack matches “quack”")).toBeInTheDocument()

      rerender(
        <QuackList
          quacks={[quack(), quack({ id: "q2" })]}
          search="quack"
        />,
      )
      expect(screen.getByText("2 quacks match “quack”")).toBeInTheDocument()
    })

    it("shows no count without a search", () => {
      render(<QuackList quacks={[quack()]} />)

      expect(screen.queryByText(/match/)).not.toBeInTheDocument()
    })

    it("highlights the term in text, name and username (AC15)", () => {
      const { container } = render(
        <QuackList
          quacks={[quack({ text: "a caffeinated quack" })]}
          search="@caffeinated"
        />,
      )

      const marks = Array.from(container.querySelectorAll("mark")).map((m) => m.textContent)
      expect(marks).toEqual(["Caffeinated", "Caffeinated", "caffeinated"])
    })

    it("offers to clear a search with no matches (AC17)", async () => {
      const onClearSearch = vi.fn()
      render(
        <QuackList
          quacks={[]}
          search="xyz"
          onClearSearch={onClearSearch}
        />,
      )

      expect(screen.getByText("No quacks match “xyz”.")).toBeInTheDocument()
      expect(screen.queryByText(/no quacks yet/i)).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole("button", { name: "Clear search" }))
      expect(onClearSearch).toHaveBeenCalledOnce()
    })

    it("shows the error, not the no-match state, when the search fails (AC18)", () => {
      render(
        <QuackList
          quacks={[]}
          search="xyz"
          error={new Error("Server unreachable")}
          onReload={vi.fn()}
        />,
      )

      expect(screen.getByText("Couldn't load quacks")).toBeInTheDocument()
      expect(screen.queryByText(/no quacks match/i)).not.toBeInTheDocument()
    })

    it("treats a lone @ as no search", () => {
      const { container } = render(
        <QuackList
          quacks={[quack()]}
          search="@"
        />,
      )

      expect(screen.queryByText(/match/)).not.toBeInTheDocument()
      expect(container.querySelector("mark")).toBeNull()
    })
  })
})
