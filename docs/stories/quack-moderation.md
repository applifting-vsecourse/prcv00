# Story: Admins can delete any quack

**As an** admin
**I want to** delete any quack, whoever posted it
**So that** nasty quacks don't stay up when their author refuses to delete them

Admins are the people we have already made admins. There is no screen for this: the team makes someone an admin by hand when asked.

## Acceptance criteria

All checked while signed in.

1. As an admin, every quack in the feed and in search results has a Delete action, including quacks by other people and by other admins. It looks and sits the same as the Delete on my own quacks.
2. As a regular user, I still only see Delete on my own quacks.
3. When an admin deletes someone else's quack, the confirmation names the author with display name and username, for example "Delete Jane Doe's (@jane) quack?", with "Keep it" and "Delete". "Keep it" changes nothing.
4. When an admin deletes their own quack, the confirmation is the usual "Delete this quack?".
5. After an admin confirms, the quack disappears for everyone, the same way as when the author deletes it: from the feed and from search results. If it had a question with answers, the question and its votes go too. Nothing is left in its place.
6. The author gets no message about it. Their quack is just gone.
7. A regular user still cannot delete someone else's quack, not even by sending the request to the server directly.
8. If someone stops being an admin while they have the page open and then tries to delete someone else's quack, the quack stays and the usual message under it says it couldn't be deleted.
9. Everything else works the same as when an author deletes their own quack: what happens if deleting fails, deleting a quack that is already gone, and where the keyboard lands afterwards.

### What you see when there is nothing to show

10. If an admin deletes the last quack in the feed, the usual "No quacks yet" message appears.

## Out of scope

- Stopping a user from posting (ban, block or mute). Likely the next story.
- A separate moderator role, or a screen for making someone an admin
- Telling the author their quack was removed
- A record of which admin deleted which quack
- A "removed by a moderator" placeholder
- Undo, or a bin to restore deleted quacks
- Deleting from the welcome page preview
- Reporting or flagging quacks
