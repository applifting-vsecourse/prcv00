// Matches the backend's limit on GET /api/quacks?q=
export const SEARCH_MAX_LENGTH = 100

// `tab` is left out for All, so the plain /quacks URL stays the default.
export type QuacksSearchParams = { q?: string; tab?: "mine" }

// Validates the `?q=` and `?tab=` of /quacks. A hand-edited or shared URL can
// carry anything: TanStack Router parses `?q=123` as a number, an over-long
// term is cut to the limit rather than sent to a server that would reject it,
// and an unknown tab falls back to All.
export function parseQuacksSearch(search: Record<string, unknown>): QuacksSearchParams {
  const { q, tab } = search
  const raw =
    typeof q === "string" || typeof q === "number" || typeof q === "boolean" ? String(q) : ""
  const term = raw.slice(0, SEARCH_MAX_LENGTH).trim()
  return {
    ...(term ? { q: term } : {}),
    ...(tab === "mine" ? { tab } : {}),
  }
}

// The term actually matched, same rules as the backend: one leading "@" is
// ignored so "@alice" finds username "alice". Used to highlight matches.
export function toMatchTerm(search: string): string {
  return search.trim().replace(/^@/, "").trim()
}
