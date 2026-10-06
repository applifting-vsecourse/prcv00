import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { addQuack } from "@/features/quack/api/addQuack"
import { QuackForm } from "@/features/quack/components/QuackForm"

vi.mock("@/features/quack/api/addQuack", () => ({ addQuack: vi.fn() }))

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

const submitted = async () => {
  await waitFor(() => expect(addQuack).toHaveBeenCalledOnce())
  return vi.mocked(addQuack).mock.calls[0]?.[0]
}

describe("QuackForm", () => {
  it("offers every mood as a labelled icon, none picked by default", () => {
    renderForm()

    const group = screen.getByRole("radiogroup", { name: "Mood" })
    expect(group).toBeInTheDocument()
    for (const label of ["Happy", "Sad", "Angry", "Silly"]) {
      expect(screen.getByRole("radio", { name: label })).not.toBeChecked()
    }
  })

  it("posts without a mood by default", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText("New quack"), "hello")
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(await submitted()).toEqual({ text: "hello", mood: null })
  })

  it("posts the picked mood", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText("New quack"), "grr")
    await userEvent.click(screen.getByRole("radio", { name: "Angry" }))
    expect(screen.getByRole("radio", { name: "Angry" })).toBeChecked()
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(await submitted()).toEqual({ text: "grr", mood: "angry" })
  })

  it("clears the mood when the picked icon is clicked again", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText("New quack"), "never mind")
    await userEvent.click(screen.getByRole("radio", { name: "Sad" }))
    await userEvent.click(screen.getByRole("radio", { name: "Sad" }))
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(await submitted()).toEqual({ text: "never mind", mood: null })
  })
})
