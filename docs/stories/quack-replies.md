# Story: Reply to a quack and see the conversation under it

**As a** quacker
**I want to** reply to a quack, and to any reply under it, and see the whole conversation in one place
**So that** everyone can tell what each reply is answering, instead of guessing from "@name …" quacks in the feed

Replies belong to the people who wrote them. When someone deletes a quack that already has replies, the replies stay where they are, but the deleted quack's words and its author really are gone: only an empty "This quack was deleted" marks its place.

## Acceptance criteria

All checked while signed in.

### Replying

1. Every quack in the feed has a Reply action, and so does every reply in a conversation.
2. A reply is text only: no mood and no question with answers. It has the same length limit as a quack, and an empty reply can't be sent.
3. After I send a reply, it appears straight away in the right place in the conversation, and the keyboard focus moves to it.
4. Each reply shows who wrote it and who it answers ("in reply to @jane").

### Seeing the conversation

5. In the feed, a quack with replies shows how many there are ("3 replies"). Deleted quacks are not counted. A quack without replies shows only the Reply action.
6. Clicking the count, or Reply, opens the conversation page: the quack at the top and all its replies under it, each reply under the one it answers.
7. Replies at the same level are in the order they were written, oldest first.
8. Replies to replies are indented. On a phone, indenting stops after 4 levels and deeper replies continue without moving further in. "In reply to @name" still says who they answer.
9. The conversation page has its own address: refreshing it, sharing the link and Back all work.
10. The All feed shows only quacks that start a conversation, never replies.

### My replies and search

11. On Mine I see my replies as well as my quacks, newest first. A reply is labelled "Reply in a conversation by @jane" (whoever started the conversation) and links to it.
12. Search finds replies too, with the same label and link. Searching on Mine finds only my quacks and my replies.
13. If the quack that started the conversation was deleted, the label says "Reply in a conversation whose quack was deleted".
14. Opening a reply from Mine or from search opens its conversation, scrolled to that reply and highlighted.
15. The welcome page preview is unchanged.

### Deleting

16. I can delete my own replies the same way as my quacks: the same Delete action, the same "Delete this quack?" confirmation, the same message if it fails.
17. If what I delete has no replies, it disappears completely, as today.
18. If what I delete has replies, its place shows only "This quack was deleted": no text, no author, no mood, no question or votes. The replies under it stay, with their authors.
19. Nobody can still read the deleted words or find out who wrote them, not even an admin, and not by asking the server directly.
20. A deleted quack has no Reply and no Delete action. Its replies can still be replied to and deleted by their authors.
21. When the last reply under a deleted quack is deleted, the "This quack was deleted" marker disappears too, and so does any deleted quack above it that has nothing left under it.
22. Admins can delete any reply, with the same rules and the same confirmation that names the author ("Delete Jane Doe's (@jane) quack?").
23. Nobody can delete someone else's reply, not even by sending the request to the server directly.
24. Signed-out visitors can't reach conversations, the same as the feed.

### What you see when there is nothing to show

25. A quack with no replies opens a conversation page showing just the quack and the Reply box, with "No replies yet. Be the first."
26. If the conversation no longer exists (everything in it was deleted), its page says "This conversation no longer exists" with a link back to the feed.
27. On Mine, "Write your first quack" shows only when I have neither quacks nor replies.

## Out of scope

- Telling anyone that someone replied to them
- Editing a reply
- Showing only part of a long conversation, or loading more of it
- Replies shown directly in the feed (without opening the conversation)
- Deleting a whole account
- A "removed by a moderator" marker, or a record of which admin deleted what
- Undo, or a bin to restore deleted replies

---

## For the team: decisions

Not for the product owner. These shape the data and are expensive to change later.

| #   | Decision                          | Chosen                                                                                                                                                                                                                                                                                                                                | Rejected, and why                                                                                                                                                                                                                             |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | What a reply is                   | A `Quack` with an optional `parentId` (self-relation). Delete, admin moderation, search and permissions work for replies without new code.                                                                                                                                                                                            | **A separate `Reply` model**: it would duplicate delete, moderation, permissions, DTOs and search, and replies to replies would need it rebuilt. **A join table**: only useful if one reply could belong to several quacks.                   |
| 2   | Depth                             | A full tree, any reply can be answered.                                                                                                                                                                                                                                                                                               | **One level**: simpler to read, but "@name" inside a thread would come back. **A flat thread with "in reply to"**: needs a second pointer and shows the tree badly.                                                                           |
| 3   | Deleting a quack that has replies | An **empty placeholder**: the row stays (`id`, `parentId`, `rootId`, `createdAt`). `text`, `mood`, `hashtags`, the poll with its votes, and `userId` are cleared, and `deletedAt` is set. A quack without replies is still deleted outright.                                                                                          | **Replies move up to the grandparent**: misrepresents what people answered. **`SetNull` on `parentId`**: replies turn into standalone quacks with no context. **Soft delete keeping the text**: breaks "the content has to really disappear". |
| 4   | The placeholder's author          | Removed: `userId` is nullable. The FK from `User` changes from `Cascade` to `SetNull`, so removing a user can never cascade through other people's replies.                                                                                                                                                                           | **Keep `userId`, hide it in the API**: the link between a person and the thread would still be stored, and account removal would still cascade. **Show "@jane deleted this"**: against the request.                                           |
| 5   | Reading a whole thread            | A `rootId` column: the top of the thread, written once when the reply is created (`parent.rootId ?? parent.id`) and never changed, so one indexed query returns a whole thread.                                                                                                                                                       | **`WITH RECURSIVE` through `$queryRaw`**: no copy, but raw SQL outside Prisma's types. **Level by level**: one query per depth level, and users set the depth.                                                                                |
| 6   | Cleaning up placeholders          | Right away, in the delete transaction: after a delete, each placeholder parent left with no children is removed, walking up the tree. Lists also hide placeholders without replies, as a guard against two deletes racing. `parent`/`root` FKs use `Restrict`, so the database refuses a hard delete that would take replies with it. | **Never clean up, only hide**: rows pile up forever and every list needs the filter. **A periodic job**: the project has no job infrastructure.                                                                                               |
| 7   | Where replies are shown           | On a conversation page. The feed shows only the count and a Reply action.                                                                                                                                                                                                                                                             | **Inline in the feed**: a tree inside a list, against `DESIGN.md`, and harder delete focus handling. **First 1–2 inline + "show all"**: double the UI. A possible later improvement.                                                          |
| 8   | Replies in lists                  | In Mine and search (labelled, linked to the conversation). Not in All, not in the welcome preview.                                                                                                                                                                                                                                    | **Only on the conversation page**: you couldn't find your own replies. **Everywhere**: the feed fills with fragments of conversations.                                                                                                        |
| 9   | What a reply can contain          | Text only. The DTO and service refuse `mood` and `poll` when there is a `parentId`.                                                                                                                                                                                                                                                   | **Text + mood**: a bigger form under every node of the tree. **Everything**: a poll in a placeholder chain, little value.                                                                                                                     |
| 10  | Replying to a placeholder         | Refused (no action in the UI, server returns an error). It also closes the race between a new reply and the cleanup in decision 6.                                                                                                                                                                                                    | Allowing it: a reply could land on a placeholder just as it is being removed, and `Restrict` would fail one of the two transactions.                                                                                                          |

## For the team: proposed `schema.prisma` change

Only the `Quack` model changes. `User`, `Poll`, `PollOption` and `PollVote` stay as they are. The `hashtags` column comes from the hashtag work in progress.

```prisma
model Quack {
  id        String     @id @default(cuid())
  // null only on a placeholder (deletedAt set): a deleted quack kept because it still has replies.
  text      String?    @db.Text
  mood      QuackMood?
  // null on a placeholder. SetNull: removing a user must never cascade through other people's replies.
  user      User?      @relation(fields: [userId], references: [id], onDelete: SetNull)
  userId    String?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @default(now()) @updatedAt
  hashtags  String[]   @default([])
  poll      Poll?
  // Set when the content was cleared. The row lives only as long as something is replying to it.
  deletedAt DateTime?

  // The quack this one answers; null for a quack that starts a conversation.
  // Restrict: the database refuses a hard delete that would take replies with it.
  parent    Quack?     @relation("QuackReplies", fields: [parentId], references: [id], onDelete: Restrict)
  parentId  String?
  replies   Quack[]    @relation("QuackReplies")

  // Top of the conversation. Written once on create (parent.rootId ?? parent.id) and never
  // changed, because replies are never moved, so a whole thread is one indexed query.
  root      Quack?     @relation("QuackThread", fields: [rootId], references: [id], onDelete: Restrict)
  rootId    String?
  thread    Quack[]    @relation("QuackThread")

  @@index([userId])
  @@index([hashtags], type: Gin)
  @@index([parentId])
  @@index([rootId, createdAt])
  @@map("quack")
}
```

Added by hand to the migration (Prisma can't express CHECK constraints, and it leaves them alone afterwards):

```sql
-- A reply has both pointers, a conversation start has neither.
ALTER TABLE "quack" ADD CONSTRAINT "quack_thread_pointers_check"
  CHECK (("parentId" IS NULL) = ("rootId" IS NULL));
-- A placeholder keeps no content and no author; a live quack always has text.
ALTER TABLE "quack" ADD CONSTRAINT "quack_placeholder_empty_check"
  CHECK (CASE WHEN "deletedAt" IS NULL
              THEN "text" IS NOT NULL
              ELSE "text" IS NULL AND "userId" IS NULL AND "mood" IS NULL
                   AND cardinality("hashtags") = 0 END);
```
