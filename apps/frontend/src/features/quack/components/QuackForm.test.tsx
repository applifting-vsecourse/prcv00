import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { QuackMood } from "@/lib/moods"

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

const renderForm = (defaultMood?: QuackMood | null) => {
  const queryClient = new QueryClient()
  const ui = (mood?: QuackMood | null) => (
    <QueryClientProvider client={queryClient}>
      <QuackForm defaultMood={mood} />
    </QueryClientProvider>
  )
  const result = render(ui(defaultMood))
  return { ...result, setDefaultMood: (mood: QuackMood | null) => result.rerender(ui(mood)) }
}

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

  describe("with a default mood from Settings", () => {
    it("starts with it picked and posts it", async () => {
      renderForm("happy")

      expect(screen.getByRole("radio", { name: "Happy" })).toBeChecked()
      await userEvent.type(screen.getByLabelText("New quack"), "yay")
      await userEvent.click(screen.getByRole("button", { name: "Quack" }))

      expect(await submitted()).toEqual({ text: "yay", mood: "happy" })
    })

    it("picks it again for the next quack", async () => {
      renderForm("happy")

      await userEvent.type(screen.getByLabelText("New quack"), "grr")
      await userEvent.click(screen.getByRole("radio", { name: "Angry" }))
      await userEvent.click(screen.getByRole("button", { name: "Quack" }))
      await submitted()

      await waitFor(() => expect(screen.getByLabelText("New quack")).toHaveValue(""))
      expect(screen.getByRole("radio", { name: "Happy" })).toBeChecked()
    })

    it("can still be cleared for one quack", async () => {
      renderForm("sad")

      await userEvent.type(screen.getByLabelText("New quack"), "fine")
      await userEvent.click(screen.getByRole("radio", { name: "Sad" }))
      await userEvent.click(screen.getByRole("button", { name: "Quack" }))

      expect(await submitted()).toEqual({ text: "fine", mood: null })
    })

    it("follows it when it loads after the form", () => {
      const { setDefaultMood } = renderForm()

      setDefaultMood("silly")

      expect(screen.getByRole("radio", { name: "Silly" })).toBeChecked()
    })

    it("does not override a mood the user already picked", async () => {
      const { setDefaultMood } = renderForm()

      await userEvent.click(screen.getByRole("radio", { name: "Angry" }))
      setDefaultMood("silly")

      expect(screen.getByRole("radio", { name: "Angry" })).toBeChecked()
    })
  })
})
