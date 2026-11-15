-- AlterTable
ALTER TABLE "quack" ADD COLUMN     "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "quack_hashtags_idx" ON "quack" USING GIN ("hashtags");

-- Backfill the quacks posted before hashtags existed. New quacks get theirs
-- from extractHashtags (src/modules/quack/domain/hashtag.ts); this is the same
-- rule in Postgres terms: "#" + letters/digits/"_" with at least one letter,
-- not glued to a word, "#" or "/"; NFC, lowercase, each tag once, in order.
UPDATE "quack" AS q
SET "hashtags" = found.tags
FROM (
  SELECT quack_id, array_agg(tag ORDER BY first_seen) AS tags
  FROM (
    SELECT quack.id AS quack_id, lower(m.match[1]) AS tag, min(m.ord) AS first_seen
    FROM "quack" AS quack,
      regexp_matches(
        normalize(quack.text, NFC),
        '(?<![[:alnum:]_#/])#([[:alnum:]_]+)',
        'g'
      ) WITH ORDINALITY AS m(match, ord)
    WHERE m.match[1] ~ '[[:alpha:]]'
    GROUP BY quack.id, lower(m.match[1])
  ) AS per_tag
  GROUP BY quack_id
) AS found
WHERE q.id = found.quack_id;
