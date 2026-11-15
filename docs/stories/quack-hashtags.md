# Story: Hashtags

**As a** Quacker user
**I want to** mark a quack with a hashtag such as #vse, and click a hashtag to see every quack that carries it
**So that** quacks about one topic are one click apart, without guessing search words

This is a small first version: hashtags you can click. Lists of popular hashtags and following a hashtag come later, if people use this.

## Acceptance criteria

All checked on the Quacks page while signed in.

### Writing a hashtag

1. A word starting with "#" in a posted quack shows as a link: "Exam done #vse" shows "#vse" underlined.
2. Letters with accents work: "#čeština" is one hashtag.
3. Digits and "\_" may be part of a hashtag ("#vse2026", "#snake_case"), but a hashtag needs at least one letter: "#1" stays plain text.
4. A hashtag ends at the first character that is not a letter, digit or "\_": in "#vse-party" only "#vse" is a link, and so it is in "#vse," or "(#vse)".
5. A "#" stuck to a word is not a hashtag: "a#b", "##vse" and "example.com/#top" stay plain text.

### Clicking a hashtag

6. Clicking "#vse" shows only quacks that contain #vse, from everyone, newest first.
7. Capitals don't matter: "#VSE", "#Vse" and "#vse" are the same hashtag and lead to the same quacks.
8. Accents do matter: "#vše" and "#vse" are two different hashtags.
9. Clicking a hashtag clears the search box and switches to the All tab, so you always see everyone's quacks with that hashtag.
10. Quacks posted before hashtags existed are included: their hashtags are links too.

### While a hashtag is shown

11. A line above the quacks says "Quacks tagged #vse", with a "Clear hashtag" button.
12. "Clear hashtag" shows all quacks again. A search typed meanwhile stays.
13. The search box and the Mine tab still work, and only narrow down the quacks with the hashtag.
14. Refreshing the page, opening a copied link elsewhere and the browser's Back button all keep the hashtag, like a search.
15. Posting a quack while a hashtag is shown: the new quack appears only if it carries that hashtag.

### When there is nothing to show

16. **No quack has the hashtag:** the page says "No quacks tagged #vse yet." It does not say "No quacks yet".
17. **On the Mine tab:** "You haven't posted any quacks tagged #vse."
18. **A search finds nothing among them:** the usual "No quacks match …" with "Clear search".
19. **Loading fails:** the usual "Couldn't load quacks" message with a Reload button.
20. **A link with something that is not a hashtag** (e.g. hand-edited to "two words"): all quacks are shown.

### Elsewhere

21. On the welcome page (signed out), hashtags in the example quacks are shown but are not links.
22. **Signed out:** opening a hashtag link asks you to sign in first.

## Out of scope

- A list of popular or trending hashtags, and suggesting hashtags while typing
- Following a hashtag, or banning one
- Hashtags inside poll answers (only the quack's own text counts)
- Ignoring accents ("#vse" finding "#vše")
- Editing a quack (quacks can't be edited today, so their hashtags never change)

---

_The sections below are for the team, not for acceptance._

## Decisions

### 1. Hashtags are stored as a list on the quack

Each quack keeps its hashtags in its own row, next to its text.

- **Rejected: search the text when someone clicks.** Nothing to store, but the database would have to read every quack's text on every click, with no index to help. The query would also have to be written by hand, outside the filters the feed already combines (search, Mine), and counting popular hashtags later would be impractical.
- **Rejected: a separate hashtag table, linked to quacks.** It is what following or banning a hashtag would need, but nothing in this story does that. It costs the most code and tests (two people creating the same new hashtag at once, hashtags left behind when their last quack is deleted) and an extra join on every feed load. Moving to it later is a mechanical migration from the stored lists.

### 2. The server reads the hashtags from the text

The server finds the hashtags when a quack is posted. The app never sends a list of them.

- **Rejected: the app sends the hashtags it found.** A client could then file a quack under hashtags it doesn't contain. Reading them from the text on the server means what is stored always matches what the quack says.

### 3. Capitals ignored, accents kept

Hashtags are stored in lowercase. Before that, accents are brought to one form (Unicode NFC), so an "é" typed as "e" plus an accent equals a typed "é".

- **Rejected: capitals matter.** "#VSE" and "#vse" would split one topic in two, and the person clicking can't tell why half the quacks are missing.
- **Rejected: accents ignored.** In Czech, a missing accent can change the word, and treating them as equal needs extra database functions. It is listed as out of scope. Adding it later means recomputing every stored hashtag.

### 4. What counts as a hashtag

A hashtag is "#" plus letters of any language, digits and "\_", with at least one letter, not stuck to a preceding word, "#" or "/".

- **Rejected: English letters only** (the usual `\w`). "#čeština" would become "#e", which is broken for Czech users.
- **Rejected: digits-only hashtags.** "#1" is usually a number ("we're #1"), not a topic.

### 5. A click shows everyone's quacks with the hashtag

A click clears the search and the Mine tab. "Clear hashtag" keeps them.

- **Rejected: keep the current search and tab.** Clicking #vse while searching for "exam" would show only a subset. The story promises "all quacks with #vse".

### 6. The hashtag rule exists twice: server and app

The server needs the rule to store hashtags, and the app needs it to turn the same words into links. Both copies run the same list of test cases.

- **Rejected: the server sends where each hashtag sits in the text.** One source of truth, but a larger response and API for every quack, for a rule that changes rarely.
- **Rejected: a shared package for both.** The monorepo has none yet, and setting up shared build tooling for one regular expression is out of proportion.

### 7. Old quacks get their hashtags in the database migration

The migration that adds the list also fills it for existing quacks, using the same rule written for the database.

- **Rejected: leave old quacks without hashtags.** Their "#vse" would still show as a link but lead to a feed without them.
- **Rejected: a one-off script run after deploying.** It is a manual step that is easy to forget on one of the environments.

## Proposed schema

The `quack` table gets one column and one index:

```prisma
model Quack {
  // ...existing fields
  // Derived from `text` when the quack is posted (lowercase, each once).
  // Quacks can't be edited, so it never goes stale.
  hashtags  String[]   @default([])

  @@index([userId])
  @@index([hashtags], type: Gin)
}
```

- Migration `20261110120000_quack_hashtags`: adds `hashtags TEXT[]` with default `{}`, a GIN index, and fills the column for existing quacks.
- `GET /api/quacks?tag=vse` filters with `hashtags @> {vse}`. `tag` accepts "vse" or "#vse" in any capitals, combines with `q` and `mine`, treats blank as "no filter", and answers 400 to anything that isn't a single hashtag.
- Example row: text `"Exam done #VSE #pond #vse"` → hashtags `{vse,pond}`.
