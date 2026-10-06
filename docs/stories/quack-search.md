# Story: Search the quack feed

**As a** signed-in Quacker user
**I want to** type a word or an author's name and see only the quacks that match
**So that** I can find a quack I saw earlier without scrolling through the whole feed

_A minimal v1 to find out whether people use search at all._

## Acceptance criteria (all on `/quacks`, signed in)

### Matching

1. Typing a word from a quack's text shows that quack. Case doesn't matter: `DUCK` finds "duck".
2. Typing part of an author's display name shows all of that author's quacks.
3. Typing part of an author's username shows all of that author's quacks. `@alice` gives the same results as `alice`.
4. Typing `pond duck` shows only quacks containing that exact phrase, not quacks that contain both words separately.
5. Typing `%` or `_` shows only quacks that literally contain that character.
6. Matching quacks appear newest first.

### Input

7. A search input sits above the feed on `/quacks`.
8. Results update after the user stops typing, without pressing Enter or a button.
9. Typing one character already filters the list.
10. Spaces only, or an empty input, show the full unfiltered feed.
11. The input accepts at most 100 characters.

### URL

12. Searching for `duck` changes the URL to `/quacks?q=duck`.
13. Refreshing that URL, or opening it in a new tab, shows the same search and results.
14. Pressing Back after a search returns to the previous search or the unfiltered feed.
15. Opening `/quacks?q=` with more than 100 characters fills the input with the first 100 characters and shows their results. No error is shown.

### What's shown

16. During a search, a count appears above the list: _"3 quacks match "duck""_ (singular: _"1 quack matches "duck""_). It isn't shown without a search.
17. The matched term is highlighted in every place it appears in quack text, author name and username.
18. While new results load, the previous list stays visible and a small loading indicator appears by the input. The list doesn't blank out.
19. **No matches:** the page shows _"No quacks match "xyz"."_ and a "Clear search" control, **not** the "No quacks yet. Post the first one." message. Clicking "Clear search" empties the input and shows the full feed.
20. **Error:** if the search fails, the page shows the feed's existing error box with Reload. Reload retries the same search, and the term stays in the input.
21. **Posting while searching:** the search stays active. The new quack appears only if it matches the term.
22. **Signed out:** opening `/quacks?q=duck` redirects to sign-in, just like the feed does today.

## Out of scope (v1)

- Accent-insensitive matching (`kachna` won't find `káchna`)
- Usage measurement or analytics (needs its own story, or v1 can't answer "do people use it?")
- "All words" or whole-word matching, date filters, search history, pagination

## Technical notes (definition of done, not browser checks)

- `GET /api/quacks` takes an optional `q`. It is trimmed, one leading `@` is stripped, and anything over 100 characters returns 400. It's documented in Swagger, and without `q` the behaviour is unchanged.
- Repository: Prisma `contains` + `mode: 'insensitive'`, OR-ed across `text`, `user.name` and `user.username`.
- Frontend: a TanStack Router search param, with `q` in the query key and `placeholderData: keepPreviousData` (AC18). The input comes from `src/components/ui/` and follows [`DESIGN.md`](../../DESIGN.md).
