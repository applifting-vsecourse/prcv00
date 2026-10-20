# Story: Delete my own quacks

**As an** author
**I want to** delete quacks I posted
**So that** I can clean up what I posted

## Acceptance criteria

All checked while signed in.

1. Each of my quacks in the feed has a Delete action. Quacks by other people don't.
2. Clicking Delete asks me to confirm first: "Delete this quack?" with "Keep it" and "Delete". "Keep it" changes nothing.
3. After I confirm, the quack disappears from the feed, also from the results of a search I'm in.
4. If the quack had a question with answers, the question and its votes go too.
5. If deleting fails, the quack stays and a message under it says it couldn't be deleted and to try again.
6. Nobody can delete someone else's quack, not even by sending the request to the server directly.
7. If the quack was already deleted (for example from another browser tab), deleting it again just removes it from the feed, without an error.
8. Using only the keyboard, after deleting I land on the next quack in the feed, not at the top of the page.

### What you see when there is nothing to show

9. Deleting my last quack, when nobody else has posted, shows the usual "No quacks yet" message.

## Out of scope

- Seeing only my own quacks (the "see only mine" part of the request — a separate story)
- Undo, or a bin to restore deleted quacks
- Editing a quack
- Admins or moderators deleting other people's quacks
- Deleting from the welcome page preview
