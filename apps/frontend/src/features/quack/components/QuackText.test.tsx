import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { QuackText } from "@/features/quack/components/QuackText"

describe("QuackText", () => {
  it("links each hashtag to the quacks that carry it", async () => {
    await renderWithRouter(<QuackText text="Exam at #VSE, then #pond" />)

    // The link shows the tag as written, but leads to its lowercase form.
    expect(await screen.findByRole("link", { name: "#VSE" })).toHaveAttribute(
      "href",
      "/quacks?tag=vse",
    )
    expect(screen.getByRole("link", { name: "#pond" })).toHaveAttribute("href", "/quacks?tag=pond")
    expect(screen.getByText(/Exam at/)).toBeInTheDocument()
  })

  it("opens the hashtag's feed on click", async () => {
    const { router } = await renderWithRouter(<QuackText text="Done #vse" />)

    await userEvent.click(await screen.findByRole("link", { name: "#vse" }))

    expect(router.state.location.pathname).toBe("/quacks")
    expect(router.state.location.search).toEqual({ tag: "vse" })
  })

  it("keeps a search highlight inside a hashtag", async () => {
    const { container } = await renderWithRouter(
      <QuackText
        text="Done #vse"
        highlight="vs"
      />,
    )

    await screen.findByRole("link", { name: "#vse" })
    expect(container.querySelector("a mark")).toHaveTextContent("vs")
  })

  it("leaves text without hashtags as it is, with no router needed", () => {
    render(<QuackText text="#1 duck, a#b" />)

    expect(screen.getByText("#1 duck, a#b")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("shows hashtags as plain text when links are off (welcome page)", () => {
    const { container } = render(
      <QuackText
        text="Done #vse"
        shouldLinkHashtags={false}
      />,
    )

    expect(container).toHaveTextContent("Done #vse")
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })
})
