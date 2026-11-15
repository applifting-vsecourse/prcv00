// What counts as a hashtag. This is a copy of the backend's rule in
// apps/backend/src/modules/quack/domain/hashtag.ts, which decides what a quack
// is stored under; this one decides which words become links. Both have the
// same test cases: change them together, or a link leads to an empty feed.
//
// "#" followed by letters (any language), digits and "_", with at least one
// letter. Not glued to a word, to another "#" or to a "/".
const HASHTAG_PATTERN = /(?<![\p{L}\p{N}\p{M}_#/])#([\p{L}\p{N}\p{M}_]+)/gu
const HAS_LETTER = /\p{L}/u

// One hashtag as typed into a ?tag= link, "vse" or "#vse".
const TAG_FILTER_PATTERN = /^#?[\p{L}\p{N}\p{M}_]+$/u

// "#VSE" and "#vse" are the same tag; accents still count ("#vše" is another).
export const normalizeHashtag = (tag: string) => tag.normalize("NFC").toLowerCase()

// A piece of quack text: plain text, or a hashtag (`text` as written, "#VSE";
// `tag` normalized, "vse") to show as a link.
export type TextSegment = { text: string; tag?: string }

export function splitHashtags(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let plainFrom = 0
  // The same normalization the backend applies before it looks for tags, so
  // the offsets below and the tags found both match what it stored.
  const normalized = text.normalize("NFC")

  for (const match of normalized.matchAll(HASHTAG_PATTERN)) {
    const [written, body = ""] = match
    if (!HAS_LETTER.test(body)) continue
    if (match.index > plainFrom) segments.push({ text: normalized.slice(plainFrom, match.index) })
    segments.push({ text: written, tag: normalizeHashtag(body) })
    plainFrom = match.index + written.length
  }
  if (plainFrom < normalized.length) segments.push({ text: normalized.slice(plainFrom) })
  return segments
}

// The tag in a ?tag= link, ready to send: "#VSE" → "vse". Anything that is not
// a single hashtag (a hand-edited URL) is dropped rather than sent to a server
// that would answer 400.
export function parseTagFilter(value: string, maxLength: number): string | undefined {
  const tag = value.trim()
  if (!tag || tag.length > maxLength || !TAG_FILTER_PATTERN.test(tag)) return undefined
  const body = tag.replace(/^#/, "")
  return HAS_LETTER.test(body) ? normalizeHashtag(body) : undefined
}
