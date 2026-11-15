# ADR 0002: A deleted quack with replies becomes an empty placeholder

## Status

Proposed, 2026-11-15. From the replies design ([story](../stories/quack-replies.md), decisions 3, 4 and 6). It becomes Accepted when the replies migration is merged.

## Context

Replies are `Quack` rows that point at the quack they answer (`parentId`) and at the top of their conversation (`rootId`), so a conversation is a tree of quacks ([story](../stories/quack-replies.md), decisions 1, 2 and 5).

The product owner set two requirements that pull against each other:

- "If an author deletes a quack that already has replies, the replies must not disappear with it." Replies belong to the people who wrote them.
- "When someone deletes their quack, its content has to really disappear from the app."

Today a delete is a hard delete: `deleteMany({ where: { id, userId } })`, with the poll, answers and votes going by cascade. The `quack-delete` and `quack-moderation` stories promise that "nothing is left in its place". In a tree, a hard delete of a quack with replies has to do _something_ with the foreign keys pointing at it: take the replies with it, cut them loose, or keep the row.

`Quack.userId` is required and cascades from `User`, so removing a user would also run through the tree and take other people's replies with it.

## Decision

A quack is split into its **place in a conversation** and its **content**, and a delete removes the content but keeps the place only while something still hangs on it.

- **No replies → hard delete, as today.** Poll, answers and votes go by cascade. Nothing is left.
- **Has replies → empty placeholder.** In one transaction the row keeps `id`, `parentId`, `rootId` and `createdAt`; `text`, `mood`, `hashtags` and `userId` are set to null/empty, the poll is deleted (answers and votes by cascade) and `deletedAt` is set. The app shows "This quack was deleted", with no author.
- **Placeholders are removed as soon as nothing hangs on them.** In the same transaction as any delete, a placeholder parent left without children is deleted, and the check repeats up the tree.
- **A placeholder can't be replied to or deleted** through the API. Only the cleanup removes it.
- **`Quack.text` and `Quack.userId` become nullable**, and the relation from `User` changes from `onDelete: Cascade` to `onDelete: SetNull`.
- **`parent` and `root` relations use `onDelete: Restrict`**, so the database refuses a hard delete that would take replies with it.
- **Two CHECK constraints**, written by hand in the migration: a reply has both `parentId` and `rootId` or neither; a row with `deletedAt` has no `text`, `userId`, `mood` or `hashtags`, and a row without it always has `text`.

## Options considered

1. **Empty placeholder (chosen).** The only option that meets both requirements: replies keep their context and their authors, and the deleted content and its author are gone from the database, not just hidden. It costs nullable columns that every reader of a quack must handle, and a more involved delete.
2. **Cascade the delete to the replies (rejected).** The simplest, and what the schema would do by default, but it deletes other people's replies, which the product owner ruled out.
3. **Move the replies up to the grandparent (rejected).** No placeholders and no nullable columns. But a reply then appears to answer something its author never answered, and under a top-level quack it turns into a standalone quack in the feed. The information about who answered whom is lost and can't be restored.
4. **Cut the replies loose with `onDelete: SetNull` on `parentId` (rejected).** The least code, but every direct reply becomes a standalone quack with no context ("Agreed!"), and its subtree a new conversation with no beginning.
5. **Soft delete that keeps the text behind a `deletedAt` flag (rejected).** Easy to undo and to audit, but it breaks "the content has to really disappear": the words stay in the database and in every backup.
6. **Placeholder that keeps `userId` but never sends it (rejected).** Fewer type changes and an admin could still see who wrote it. But the link between a person and the thread stays stored, and removing a user would still cascade through other people's replies.

## Consequences

For the rest of the application, not just replies:

- **A quack may have no text and no author.** `text` and `userId` are nullable for every reader: the response DTO, the zod schema in `quackSchemas.ts`, `QuackItem`, `UsersName`/`UsersUserName`, `QuackText` and search highlighting, and the seed. Code that assumed both are always there must check `deletedAt` first.
- **Every list must decide about placeholders.** The All feed shows a placeholder only when it starts a conversation that still has replies. Mine, search and the hashtag filter drop them on their own (no `userId`, no `text`, no `hashtags`). Any new list, count or statistic ("how many quacks has @jane posted") must filter `deletedAt: null` or say why not.
- **Deleting is no longer one `deleteMany`.** It is a transaction with two branches and a cleanup loop, for authors and for admins alike. The rule in `CLAUDE.md` still holds: the clearing write is scoped too, `updateMany({ where: { id, userId } })` for an author. A placeholder has no `userId`, so no scoped write can touch it again.
- **"Nothing is left in its place" now holds only for quacks without replies.** The `quack-delete` and `quack-moderation` behaviour stays, but a quack with replies turns into a placeholder in its conversation instead of vanishing. Tests that expect it to vanish must use a quack without replies.
- **Every new column on `Quack` must be classified** as _content_ (cleared when a placeholder is made and added to the CHECK constraint) or _position_ (kept). Forgetting it leaves content behind after a delete, which breaks the promise to the product owner. Hashtags are the first example ([ADR 0001](0001-hashtags-derived-column-on-quack.md): clearing text clears hashtags).
- **Polls belong to content.** A placeholder never has a poll. Voting on or closing the poll of a deleted quack answers 404, the same as for a quack that is gone.
- **Removing a user no longer deletes their quacks.** `SetNull` leaves that user's quacks with their text and no author. A future "delete my account" story must first turn that user's quacks into placeholders or delete them in the same way. Otherwise authorless text stays in the app. The CHECK constraint does not catch it, because `deletedAt` is still null.
- **Raw SQL and the seed must respect `Restrict`.** Deleting a whole conversation means deleting leaves first, or `TRUNCATE … CASCADE` in a reset script. Whether Postgres accepts a single `DELETE FROM quack` that removes a parent and its children in one statement under `RESTRICT` (rather than `NO ACTION`) must be checked when the migration is written. If it doesn't, use `NoAction`, which is checked at the end of the statement and still protects the tree.
- **The migration can't be cleanly rolled back once placeholders exist.** `text` and `userId` can't become required again without deleting placeholders and the replies that hang on them. Before the first placeholder is created, a rollback is a plain reverse migration.
- **Undo or a bin for deleted quacks is ruled out by design.** The content is gone. Any "restore" feature would need a different decision recorded as a new ADR.
