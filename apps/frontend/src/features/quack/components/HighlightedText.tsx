type HighlightedTextProps = {
  text: string
  term?: string
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Marks every case-insensitive occurrence of `term`, so a search result shows
// why it matched — in the text, or in the author's name.
export function HighlightedText({ text, term }: HighlightedTextProps) {
  if (!term) return text

  // With a capturing group, split() puts the matches at the odd indexes.
  const parts = text.split(new RegExp(`(${escapeRegExp(term)})`, "gi"))

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark
        key={index}
        className="rounded-sm bg-secondary text-secondary-foreground"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  )
}
