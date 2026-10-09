import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { HighlightedText } from "@/features/quack/components/HighlightedText"

const marksIn = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("mark")).map((mark) => mark.textContent)

describe("HighlightedText", () => {
  it("renders plain text without a term", () => {
    const { container } = render(<HighlightedText text="Duck pond" />)

    expect(container.textContent).toBe("Duck pond")
    expect(marksIn(container)).toEqual([])
  })

  it("marks every occurrence, ignoring case", () => {
    const { container } = render(
      <HighlightedText
        text="Duck, duck, DUCK!"
        term="duck"
      />,
    )

    expect(container.textContent).toBe("Duck, duck, DUCK!")
    expect(marksIn(container)).toEqual(["Duck", "duck", "DUCK"])
  })

  it("treats regex characters literally", () => {
    const { container } = render(
      <HighlightedText
        text="a.b axb 100%"
        term="a.b"
      />,
    )

    expect(marksIn(container)).toEqual(["a.b"])
  })
})
