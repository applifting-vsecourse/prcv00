// Matches the backend's limit on GET /api/quacks?q=
export const SEARCH_MAX_LENGTH = 100

export type QuacksSearchParams = { q?: string }

// Validates the `?q=` of /quacks. A hand-edited or shared URL can carry
// anything: TanStack Router parses `?q=123` as a number, and an over-long term
// is cut to the limit rather than sent to a server that would reject it.
export function parseQuacksSearch(search: Record<string, unknown>): QuacksSearchParams {
  const { q } = search
  const raw = typeof q === "string" || typeof q === "number" || typeof q === "boolean" ? String(q) : ""
  const term = raw.slice(0, SEARCH_MAX_LENGTH).trim()
  return term ? { q: term } : {}
}

// The term actually matched, same rules as the backend: one leading "@" is
// ignored so "@alice" finds username "alice". Used to highlight matches.
export function toMatchTerm(search: string): string {
  return search.trim().replace(/^@/, "").trim()
}
