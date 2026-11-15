# ADR 0001: Hashtags are a derived column on the quack

## Status

Accepted, 2026-11-10. From the hashtag work ([story](../stories/quack-hashtags.md), decision 1).

## Context

Users want to click a hashtag such as #vse and see every quack that contains it. That needs a fast "which quacks carry this tag" query that combines with the filters the feed already has (search, Mine) in one Prisma `where`.

Hashtags are not entered separately: they are words inside `quack.text`. Whatever we store is a copy of something the text already says, so the question is where that copy lives and who keeps it in step with the text.

Quacks can't be edited today. The only ways `text` gets written are posting a quack (`QuacksService.createQuack`) and the seed.

## Decision

`quack.hashtags` is a `TEXT[]` column on the `quack` row with a GIN index. It holds the quack's hashtags, normalized (NFC, lowercase), each once, in the order they first appear.

- **The server derives it from `text`** with `extractHashtags` (`apps/backend/src/modules/quack/domain/hashtag.ts`) in the same write that stores the text. The client never sends it.
- **It is a cache of `text`, never a source of truth.** Whenever `text` is written or cleared, `hashtags` is written or cleared in the same write.
- **Filtering uses `hashtags: { has: tag }`**, a whole-value match served by the GIN index. No `LIKE`, no raw SQL.
- **Existing rows are backfilled by the migration that adds the column** (`20261110120000_quack_hashtags`), with the same rule written for Postgres.

## Considered options

1. **Derived array column on `quack` (chosen).** One column, no join, stays inside Prisma's typed `where`, indexed. It costs a copy of the text that must be kept in step.
2. **Search the text on every request (rejected).** Nothing to keep in step, and a rule change applies to old quacks at once. But it needs a regular expression query through `$queryRaw`, outside the composable `where` and Prisma's types. It also reads every row on each click with no usable index, and makes "popular hashtags" impractical.
3. **`Hashtag` + `QuackHashtag` tables (rejected for now).** A hashtag becomes an entity that can be followed, banned or described, and is counted with `groupBy`. But it is the most code (upserts racing on a new tag, orphaned tags after deletes, a transaction per post) and an extra join on every feed load, for features nobody has asked for yet. Moving from option 1 to this is a mechanical migration from the stored arrays, while going back the other way would be expensive once other features hang off a `Hashtag` table.

## Consequences

For the rest of the application, not just hashtags:

- **Every code path that writes `quack.text` must also write `quack.hashtags`.** Today that is `createQuack` and the seed's `create-quack.ts`. Any future path must call `extractHashtags` in the same write: editing a quack, an import, a reply that is itself a `Quack` row, an admin tool. A path that forgets it doesn't fail. Its hashtags simply aren't clickable.
- **Clearing text clears hashtags.** The planned reply placeholders (a deleted quack kept because it has replies, [replies story](../stories/quack-replies.md) decision 3) must empty `hashtags` together with `text`. Otherwise the placeholder would still turn up under #vse with no content.
- **Editing quacks, if it ever comes, is no longer "update one column".** The edit must recompute `hashtags`, and the comment on the schema ("quacks can't be edited, so it never goes stale") must go.
- **Changing what counts as a hashtag is a data migration.** Allowing "-" in tags, or ignoring accents, means a migration that recomputes `hashtags` for every row. The rule also lives in three places that must change together: the backend (`hashtag.ts`), the frontend copy that draws the links (`features/quack/lib/hashtags.ts`) with the same test cases, and the SQL in any backfill.
- **Raw SQL writes bypass the rule.** An `UPDATE quack SET text = …` in a migration or script must recompute `hashtags` itself.
- **Hashtag features that need an entity go to option 3.** Following, banning, describing or renaming a hashtag means first migrating to the `Hashtag` tables, filled from the stored arrays, not bolting it onto the array.
- **The `quack` row grows a little,** and the GIN index makes inserts slightly slower. Negligible at 280-character quacks.
