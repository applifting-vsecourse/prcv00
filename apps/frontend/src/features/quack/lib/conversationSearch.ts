// `reply`: the reply a link from Mine or search points at, scrolled to and
// highlighted. `compose`: open with the cursor in the reply box (the feed's
// Reply). Both are left out when not set, so the plain URL is the default.
export type ConversationSearchParams = { reply?: string; compose?: true }

export function parseConversationSearch(search: Record<string, unknown>): ConversationSearchParams {
  const { reply, compose } = search
  return {
    ...(typeof reply === "string" && reply ? { reply } : {}),
    ...(compose === true || compose === "true" ? { compose: true as const } : {}),
  }
}
