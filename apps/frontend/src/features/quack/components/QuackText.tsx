import { Link } from "@tanstack/react-router"

import { HighlightedText } from "@/features/quack/components/HighlightedText"
import { splitHashtags } from "@/features/quack/lib/hashtags"

type QuackTextProps = {
  text: string
  // The search term to mark, in hashtags too.
  highlight?: string
  // Off on the signed-out welcome page, where the feed it leads to is closed.
  shouldLinkHashtags?: boolean
}

// A quack's text with every hashtag as a link to all quacks that carry it.
// The link drops the search and the Mine tab: "#vse" means everyone's #vse.
export function QuackText({ text, highlight, shouldLinkHashtags = true }: QuackTextProps) {
  return splitHashtags(text).map((segment, index) =>
    segment.tag && shouldLinkHashtags ? (
      <Link
        key={index}
        to="/quacks"
        search={{ tag: segment.tag }}
        className="font-medium text-foreground underline underline-offset-4"
      >
        <HighlightedText
          text={segment.text}
          term={highlight}
        />
      </Link>
    ) : (
      <HighlightedText
        key={index}
        text={segment.text}
        term={highlight}
      />
    ),
  )
}
