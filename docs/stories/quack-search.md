# Story: Search the quack feed

**As a** Quacker user
**I want to** type a word I remember, or who wrote it, and see only the quacks that match
**So that** I can find a quack I saw earlier without scrolling through the whole feed

This is a small first version. We want to see whether people use search before building more.

## Acceptance criteria

All checked on the Quacks page while signed in.

### What it finds

1. Typing a word from a quack shows that quack. Capital letters don't matter: "DUCK" finds "duck".
2. Typing part of an author's name shows that author's quacks.
3. Typing part of an author's @handle shows that author's quacks, with or without the "@".
4. Several words are searched as one phrase: "pond duck" finds "the pond duck", but not "duck by the pond".
5. Matching quacks are shown newest first.

### Typing

6. The search box sits above the list of quacks.
7. Results update by themselves shortly after you stop typing. There is no search button.
8. One letter is enough to start searching.
9. Emptying the box, or leaving only spaces in it, shows all quacks again.
10. The box takes at most 100 characters.

### Keeping the search

11. Refreshing the page keeps the search and its results.
12. Copying the page link and opening it elsewhere shows the same search.
13. The browser's Back button returns to the previous search, or to all quacks.

### What you see

14. While searching, a line above the results says how many quacks match: "3 quacks match "duck"", or "1 quack matches "duck"".
15. The searched word is highlighted wherever it appears: in the quack, the author's name or the @handle.
16. While new results load, the current ones stay on screen and a small loading sign appears in the search box.
17. **Nothing found:** the page says "No quacks match "xyz"." and offers a "Clear search" button that brings back all quacks. It does not say "No quacks yet".
18. **Search fails:** the usual "Couldn't load quacks" message appears with a Reload button. Reload tries the same search again, and the text stays in the box.
19. **Posting while searching:** the search stays. The new quack appears only if it matches.
20. **Signed out:** opening a search link asks you to sign in first.

## Out of scope

- Ignoring accents: "kachna" won't find "káchna"
- Searching by mood
- Measuring how many people use search (a separate story)
- Matching all words in any order, whole words only, filtering by date, search history
