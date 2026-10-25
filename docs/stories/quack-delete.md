# Story: Delete my own quacks and see only mine

**As an** author
**I want to** see only the quacks I posted, and delete them
**So that** I can find what I posted and clean it up

## Acceptance criteria

All checked while signed in.

### Seeing only mine

1. Above the feed there are two tabs: All and Mine. The feed opens on All, which shows everyone's quacks as before.
2. Mine shows only quacks I posted, newest first.
3. Searching while on Mine searches only my quacks. Searching while on All searches everyone's, as before.
4. The tab I'm on stays after I refresh the page, and Back takes me to the tab I was on before. A link to the Mine tab opens on Mine.
5. The tabs can be switched with the keyboard alone.
6. Signed-out visitors can't reach the feed at all, the same as today.

### Deleting

7. Each of my quacks in the feed has a Delete action, on both tabs. Quacks by other people don't.
8. Clicking Delete asks me to confirm first: "Delete this quack?" with "Keep it" and "Delete". "Keep it" changes nothing.
9. After I confirm, the quack disappears from the feed on both tabs, also from the results of a search I'm in.
10. If the quack had a question with answers, the question and its votes go too.
11. If deleting fails, the quack stays and a message under it says it couldn't be deleted and to try again.
12. Nobody can delete someone else's quack, not even by sending the request to the server directly.
13. If the quack was already deleted (for example from another browser tab), deleting it again just removes it from the feed, without an error.
14. Using only the keyboard, after deleting I land on the next quack in the feed, not at the top of the page.

### What you see when there is nothing to show

15. On Mine, when I haven't posted anything yet, it says so and offers a "Write your first quack" button. The button takes me to the box for writing a new quack, ready to type.
16. Deleting my last quack on Mine shows the same message and button.
17. Searching on Mine with no matching quacks of mine shows the usual "No quacks match" message with "Clear search".
18. Deleting my last quack on All, when nobody else has posted, shows the usual "No quacks yet" message.

## Out of scope

- Other people's "Mine" (a profile page listing someone else's quacks)
- Counting how many quacks I have
- Undo, or a bin to restore deleted quacks
- Editing a quack
- Admins or moderators deleting other people's quacks
- Deleting from the welcome page preview
