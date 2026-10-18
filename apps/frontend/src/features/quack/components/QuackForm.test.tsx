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
    poll: null,
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

    expect(await submitted()).toEqual({ text: "hello", mood: null, poll: null })
  })

  it("posts the picked mood", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText("New quack"), "grr")
    await userEvent.click(screen.getByRole("radio", { name: "Angry" }))
    expect(screen.getByRole("radio", { name: "Angry" })).toBeChecked()
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(await submitted()).toEqual({ text: "grr", mood: "angry", poll: null })
  })

  it("clears the mood when the picked icon is clicked again", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText("New quack"), "never mind")
    await userEvent.click(screen.getByRole("radio", { name: "Sad" }))
    await userEvent.click(screen.getByRole("radio", { name: "Sad" }))
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(await submitted()).toEqual({ text: "never mind", mood: null, poll: null })
  })

  describe("with a default mood from Settings", () => {
    it("starts with it picked and posts it", async () => {
      renderForm("happy")

      expect(screen.getByRole("radio", { name: "Happy" })).toBeChecked()
      await userEvent.type(screen.getByLabelText("New quack"), "yay")
      await userEvent.click(screen.getByRole("button", { name: "Quack" }))

      expect(await submitted()).toEqual({ text: "yay", mood: "happy", poll: null })
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

      expect(await submitted()).toEqual({ text: "fine", mood: null, poll: null })
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

  describe("asking a question", () => {
    const addAnswers = () => userEvent.click(screen.getByRole("button", { name: "Add answers" }))
    const answerField = (n: number) => screen.getByLabelText(`Answer ${n}`)
    const post = () => userEvent.click(screen.getByRole("button", { name: "Quack" }))

    it("starts with two answers, ready to type into", async () => {
      renderForm()

      await addAnswers()

      expect(answerField(1)).toHaveFocus()
      expect(answerField(2)).toBeInTheDocument()
      expect(screen.queryByLabelText("Answer 3")).not.toBeInTheDocument()
      // Two is the minimum, so neither can be removed.
      expect(screen.queryByRole("button", { name: /^Remove answer \d/ })).not.toBeInTheDocument()
    })

    it("allows up to six answers", async () => {
      renderForm()
      await addAnswers()

      for (let i = 0; i < 4; i++) {
        await userEvent.click(screen.getByRole("button", { name: "Add an answer" }))
      }

      expect(answerField(6)).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Add an answer" })).not.toBeInTheDocument()
      expect(screen.getAllByRole("button", { name: /^Remove answer \d/ })).toHaveLength(6)
    })

    it("posts the question with its answers, trimmed and in order", async () => {
      renderForm()

      await userEvent.type(screen.getByLabelText("New quack"), "Lunch?")
      await addAnswers()
      await userEvent.type(answerField(1), "  Pizza ")
      await userEvent.type(answerField(2), "Sushi")
      await post()

      expect(await submitted()).toEqual({
        text: "Lunch?",
        mood: null,
        poll: { options: ["Pizza", "Sushi"] },
      })
    })

    it.each([
      ["an empty answer", ["Pizza", ""], 2, "Write an answer, or remove it"],
      ["an answer over 50 characters", ["a".repeat(51), "b"], 1, "Keep it under 50 characters"],
      ["the same answer twice", ["Pizza", "pizza "], 2, "This answer is already on the list"],
    ])("refuses %s, next to that answer", async (_label, [first, second], badField, message) => {
      renderForm()
      await userEvent.type(screen.getByLabelText("New quack"), "Lunch?")
      await addAnswers()
      if (first) await userEvent.type(answerField(1), first)
      if (second) await userEvent.type(answerField(2), second)

      await post()

      expect(await screen.findByText(message)).toBeInTheDocument()
      expect(answerField(badField)).toHaveAttribute("aria-invalid", "true")
      expect(addQuack).not.toHaveBeenCalled()
    })

    it("puts the cursor in a newly added answer", async () => {
      renderForm()
      await addAnswers()

      await userEvent.click(screen.getByRole("button", { name: "Add an answer" }))

      await waitFor(() => expect(answerField(3)).toHaveFocus())
    })

    it("moves focus to the previous answer when one is removed", async () => {
      renderForm()
      await addAnswers()
      await userEvent.click(screen.getByRole("button", { name: "Add an answer" }))

      await userEvent.click(screen.getByRole("button", { name: "Remove answer 3" }))

      expect(screen.queryByLabelText("Answer 3")).not.toBeInTheDocument()
      await waitFor(() => expect(answerField(2)).toHaveFocus())
    })

    it("goes back to a plain quack when the answers are removed", async () => {
      renderForm()
      await userEvent.type(screen.getByLabelText("New quack"), "never mind")
      await addAnswers()

      await userEvent.click(screen.getByRole("button", { name: "Remove answers" }))
      await waitFor(() => expect(screen.getByLabelText("New quack")).toHaveFocus())
      await post()

      expect(await submitted()).toEqual({ text: "never mind", mood: null, poll: null })
    })

    it("clears the answers after posting", async () => {
      renderForm()
      await userEvent.type(screen.getByLabelText("New quack"), "Lunch?")
      await addAnswers()
      await userEvent.type(answerField(1), "Pizza")
      await userEvent.type(answerField(2), "Sushi")
      await post()
      await submitted()

      await waitFor(() => expect(screen.queryByLabelText("Answer 1")).not.toBeInTheDocument())
      expect(screen.getByRole("button", { name: "Add answers" })).toBeInTheDocument()
    })
  })
})
