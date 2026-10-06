import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { addQuack } from "@/features/quack/api/addQuack"
import { QuackForm } from "@/features/quack/components/QuackForm"

vi.mock("@/features/quack/api/addQuack", () => ({ addQuack: vi.fn() }))

// jsdom lacks the pointer-capture and scrolling APIs Radix Select calls.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

beforeEach(() => {
  vi.mocked(addQuack).mockReset()
  vi.mocked(addQuack).mockResolvedValue({
    id: "q1",
    text: "hello",
    mood: null,
    userId: "u1",
    createdAt: new Date(),
    user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  })
})

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <QuackForm />
    </QueryClientProvider>,
  )

describe("QuackForm", () => {
  it("posts without a mood by default", async () => {
    renderForm()

    expect(screen.getByRole("combobox", { name: "Mood" })).toHaveTextContent("No mood")

    await userEvent.type(screen.getByLabelText("New quack"), "hello")
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    await waitFor(() => expect(addQuack).toHaveBeenCalledOnce())
    expect(vi.mocked(addQuack).mock.calls[0]?.[0]).toEqual({ text: "hello", mood: null })
  })

  it("posts the chosen mood", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText("New quack"), "grr")
    await userEvent.click(screen.getByRole("combobox", { name: "Mood" }))
    await userEvent.click(screen.getByRole("option", { name: /angry/i }))
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    await waitFor(() => expect(addQuack).toHaveBeenCalledOnce())
    expect(vi.mocked(addQuack).mock.calls[0]?.[0]).toEqual({ text: "grr", mood: "angry" })
  })
})
