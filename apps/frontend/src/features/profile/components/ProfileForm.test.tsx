import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { UsernameTakenError } from "@/features/profile/api/profileErrors"
import type { Profile } from "@/features/profile/api/profileSchemas"
import { updateProfile } from "@/features/profile/api/updateProfile"
import { ProfileForm } from "@/features/profile/components/ProfileForm"

vi.mock("@/features/profile/api/updateProfile", () => ({ updateProfile: vi.fn() }))
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const saved: Profile = {
  username: "CaffeinatedDuck",
  name: "Caffeinated Duck",
  bio: "Three espressos in.",
  defaultQuackMood: "silly",
}

beforeEach(() => {
  vi.mocked(updateProfile).mockReset()
  vi.mocked(updateProfile).mockImplementation((input) => Promise.resolve(input))
  vi.mocked(toast.success).mockReset()
})

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProfileForm profile={saved} />
    </QueryClientProvider>,
  )

const usernameInput = () => screen.getByLabelText("Username")
const save = () => userEvent.click(screen.getByRole("button", { name: "Save changes" }))

const submitted = async () => {
  await waitFor(() => expect(updateProfile).toHaveBeenCalledOnce())
  return vi.mocked(updateProfile).mock.calls[0]?.[0]
}

describe("ProfileForm", () => {
  it("starts with the saved profile", () => {
    renderForm()

    expect(usernameInput()).toHaveValue("CaffeinatedDuck")
    expect(screen.getByLabelText("Name")).toHaveValue("Caffeinated Duck")
    expect(screen.getByLabelText("Bio")).toHaveValue("Three espressos in.")
    expect(screen.getByRole("radio", { name: "Silly" })).toBeChecked()
  })

  it.each([
    ["ab", "Use at least 3 characters"],
    ["a".repeat(31), "Use at most 30 characters"],
    ["duck pond", "Use only letters, numbers, dots and underscores"],
  ])("rejects the username %j without saving", async (username, message) => {
    renderForm()

    await userEvent.clear(usernameInput())
    await userEvent.type(usernameInput(), username)
    await save()

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it("requires a name and keeps the bio to 160 characters", async () => {
    renderForm()

    await userEvent.clear(screen.getByLabelText("Name"))
    await userEvent.clear(screen.getByLabelText("Bio"))
    await userEvent.type(screen.getByLabelText("Bio"), "a".repeat(161))
    await save()

    expect(await screen.findByText("Name is required")).toBeInTheDocument()
    expect(screen.getByText("Keep it under 160 characters")).toBeInTheDocument()
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it("saves trimmed values, an empty bio as none, and confirms", async () => {
    renderForm()

    await userEvent.clear(usernameInput())
    await userEvent.type(usernameInput(), "  Sleepy.Duck_2 ")
    await userEvent.clear(screen.getByLabelText("Bio"))
    await userEvent.click(screen.getByRole("radio", { name: "None" }))
    await save()

    expect(await submitted()).toEqual({
      username: "Sleepy.Duck_2",
      name: "Caffeinated Duck",
      bio: null,
      defaultQuackMood: null,
    })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Settings saved"))
  })

  it("says a taken username next to the field and keeps what was typed", async () => {
    vi.mocked(updateProfile).mockRejectedValue(new UsernameTakenError())
    renderForm()

    await userEvent.clear(usernameInput())
    await userEvent.type(usernameInput(), "PondAdmin")
    await save()

    expect(
      await screen.findByText("This username is already taken. Try another one."),
    ).toBeInTheDocument()
    expect(usernameInput()).toHaveValue("PondAdmin")
    expect(usernameInput()).toHaveAttribute("aria-invalid", "true")
    expect(usernameInput()).toHaveFocus()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("discards changes back to what is saved", async () => {
    renderForm()
    const discard = screen.getByRole("button", { name: "Discard changes" })
    expect(discard).toHaveAttribute("aria-disabled", "true")

    await userEvent.type(usernameInput(), "_new")
    await userEvent.click(screen.getByRole("radio", { name: "Angry" }))
    await userEvent.click(discard)

    expect(usernameInput()).toHaveValue("CaffeinatedDuck")
    expect(screen.getByRole("radio", { name: "Silly" })).toBeChecked()
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it("discards back to the last save, not the first load", async () => {
    renderForm()

    await userEvent.type(usernameInput(), "2")
    await save()
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    await userEvent.type(usernameInput(), "3")
    await userEvent.click(screen.getByRole("button", { name: "Discard changes" }))

    expect(usernameInput()).toHaveValue("CaffeinatedDuck2")
  })

  // A disabled element drops focus to <body>, sending keyboard users back to
  // the top of the page. These pin down where focus stays instead.
  describe("focus", () => {
    it("stays in the field when Enter saves", async () => {
      renderForm()

      await userEvent.click(screen.getByLabelText("Name"))
      await userEvent.keyboard("{Enter}")

      await waitFor(() => expect(toast.success).toHaveBeenCalled())
      expect(screen.getByLabelText("Name")).toHaveFocus()
    })

    it("stays on Save while saving, and a second press does not save twice", async () => {
      let finishSaving: (profile: Profile) => void = () => undefined
      vi.mocked(updateProfile).mockImplementation(
        () => new Promise((resolve) => (finishSaving = resolve)),
      )
      renderForm()
      const saveButton = screen.getByRole("button", { name: "Save changes" })

      await userEvent.click(saveButton)
      await waitFor(() => expect(saveButton).toHaveAttribute("aria-disabled", "true"))
      expect(saveButton).toHaveFocus()
      // jsdom keeps focus on disabled elements, browsers don't, so check the
      // cause directly: nothing the user may be focused on gets disabled.
      for (const field of [
        usernameInput(),
        screen.getByLabelText("Name"),
        screen.getByLabelText("Bio"),
      ]) {
        expect(field).toBeEnabled()
        expect(field).toHaveAttribute("readonly")
      }
      for (const radio of screen.getAllByRole("radio")) expect(radio).toBeEnabled()

      await userEvent.click(saveButton)
      finishSaving(saved)

      await waitFor(() => expect(toast.success).toHaveBeenCalled())
      expect(updateProfile).toHaveBeenCalledOnce()
      expect(saveButton).toHaveFocus()
      expect(saveButton).toHaveAttribute("aria-disabled", "false")
    })

    it("stays on Discard after discarding", async () => {
      renderForm()
      const discard = screen.getByRole("button", { name: "Discard changes" })

      await userEvent.type(usernameInput(), "_new")
      await userEvent.click(discard)

      expect(usernameInput()).toHaveValue("CaffeinatedDuck")
      expect(discard).toHaveFocus()
      expect(discard).toHaveAttribute("aria-disabled", "true")
    })
  })
})
