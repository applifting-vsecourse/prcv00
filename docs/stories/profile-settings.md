# Story: Change my username and profile in Settings

**As a** Quacker user
**I want to** change my username to one I really like
**So that** people find me under a name I'm happy with

## Acceptance criteria

All checked while signed in.

### Finding the page

1. The user menu in the header (the round button with my initials) has a "Settings" item that opens the Settings page.
2. The Settings page keeps the usual header, like every other page.

### Username

3. The username field starts with my current username, with the capital letters I chose.
4. A username has 3–30 characters: letters, numbers, dots and underscores. Anything else is refused with a message under the field, and nothing is saved.
5. If someone else already has the username, a message under the username field says so. What I typed stays in the field.
6. Capital letters don't make a name new: if "PondAdmin" is taken, so is "pondadmin".
7. After saving, a short "Settings saved" message appears, and my new @username shows straight away in the user menu and on all my quacks, old ones included.

### Name and bio

8. The name field starts with my current name. It can't be left empty.
9. The bio is optional and holds at most 160 characters. A counter under it shows how many I've used.
10. Emptying the bio and saving removes it.

### Default mood

11. I can pick a default mood for my new quacks: none, Happy, Sad, Angry or Silly.
12. On the Quacks page, the new-quack form already has that mood picked. I can still pick another one, or none, for a single quack.
13. After I post, the form picks my default mood again for the next quack.

### Saving and discarding

14. One "Save changes" button saves everything on the page at once. While saving, it shows it is busy.
15. "Discard changes" puts every field back to what is saved. It can only be pressed once I've changed something.
16. If saving fails for another reason, a message at the top of the form says so, and what I typed stays.

### What you see when there is nothing to show

17. While my settings load, a small loading sign shows where the form will be.
18. If they can't be loaded, the page says "Couldn't load your settings" with a Reload button.

## Out of scope

- A public profile page where others can read my bio (the bio is stored, but only I see it for now)
- Changing my email or password
- A profile picture
- Limiting how often a username can be changed, or reserving old usernames
- Telling followers or mentioned users that a username changed
