import { parseTagFilter } from "@/features/quack/lib/hashtags"

// Matches the backend's limit on GET /api/quacks?q= (and ?tag=)
export const SEARCH_MAX_LENGTH = 100

// `tab` is left out for All, so the plain /quacks URL stays the default.
// `tag` is a hashtag without the "#", lowercase: /quacks?tag=vse.
export type QuacksSearchParams = { q?: string; tab?: "mine"; tag?: string }

// Validates the `?q=`, `?tab=` and `?tag=` of /quacks. A hand-edited or shared
// URL can carry anything: TanStack Router parses `?q=123` as a number, an
// over-long term is cut to the limit rather than sent to a server that would
// reject it, an unknown tab falls back to All, and a tag that is not a single
// hashtag is dropped (all quacks are shown instead).
export function parseQuacksSearch(search: Record<string, unknown>): QuacksSearchParams {
  const { q, tab, tag: rawTag } = search
  const raw =
    typeof q === "string" || typeof q === "number" || typeof q === "boolean" ? String(q) : ""
  const term = raw.slice(0, SEARCH_MAX_LENGTH).trim()
  const tag = typeof rawTag === "string" ? parseTagFilter(rawTag, SEARCH_MAX_LENGTH) : undefined
  return {
    ...(term ? { q: term } : {}),
    ...(tab === "mine" ? { tab } : {}),
    ...(tag ? { tag } : {}),
  }
}

// The term actually matched, same rules as the backend: one leading "@" is
// ignored so "@alice" finds username "alice". Used to highlight matches.
export function toMatchTerm(search: string): string {
  return search.trim().replace(/^@/, "").trim()
}
