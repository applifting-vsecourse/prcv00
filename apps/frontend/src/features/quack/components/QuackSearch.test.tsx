import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { QuackSearch, SEARCH_DEBOUNCE_MS } from "@/features/quack/components/QuackSearch"

describe("QuackSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const wait = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  }

  const type = (value: string) =>
    fireEvent.change(screen.getByLabelText("Search quacks"), { target: { value } })

  it("has a visible label and a 100 character limit (AC11)", () => {
    render(
      <QuackSearch
        value=""
        onSearch={vi.fn()}
      />,
    )

    expect(screen.getByLabelText("Search quacks")).toHaveAttribute("maxlength", "100")
  })

  it("searches once the user stops typing, trimmed (AC8)", () => {
    const onSearch = vi.fn()
    render(
      <QuackSearch
        value=""
        onSearch={onSearch}
      />,
    )

    type(" du")
    wait(SEARCH_DEBOUNCE_MS - 1)
    type(" duck ")
    wait(SEARCH_DEBOUNCE_MS - 1)
    expect(onSearch).not.toHaveBeenCalled()

    wait(1)
    expect(onSearch).toHaveBeenCalledExactlyOnceWith("duck")
  })

  it("clears the search when the input is emptied (AC10)", () => {
    const onSearch = vi.fn()
    render(
      <QuackSearch
        value="duck"
        onSearch={onSearch}
      />,
    )

    type("")
    wait(SEARCH_DEBOUNCE_MS)

    expect(onSearch).toHaveBeenCalledExactlyOnceWith("")
  })

  it("shows a search that changed elsewhere, e.g. Back or Clear search (AC14, AC19)", () => {
    const { rerender } = render(
      <QuackSearch
        value="duck"
        onSearch={vi.fn()}
      />,
    )

    rerender(
      <QuackSearch
        value=""
        onSearch={vi.fn()}
      />,
    )

    expect(screen.getByLabelText("Search quacks")).toHaveValue("")
  })

  it("keeps a trailing space while the user is still typing", () => {
    const onSearch = vi.fn()
    const { rerender } = render(
      <QuackSearch
        value=""
        onSearch={onSearch}
      />,
    )

    type("pond ")
    wait(SEARCH_DEBOUNCE_MS)
    // The page puts the trimmed term in the URL and passes it back down.
    rerender(
      <QuackSearch
        value="pond"
        onSearch={onSearch}
      />,
    )

    expect(screen.getByLabelText("Search quacks")).toHaveValue("pond ")
  })

  it("announces loading while results are on their way (AC18)", () => {
    render(
      <QuackSearch
        value="duck"
        onSearch={vi.fn()}
        isSearching
      />,
    )

    expect(screen.getByRole("status")).toHaveTextContent("Searching…")
  })
})
