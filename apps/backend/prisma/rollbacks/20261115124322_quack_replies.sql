-- Rollback of 20261115124322_quack_replies. Run by hand, then delete the row
-- for that migration from "_prisma_migrations".
--
-- Clean only while no reply or placeholder exists. Once they do, text and
-- userId can't be required again without deleting every placeholder and every
-- reply (docs/adr/0002, Consequences). The first statement stops the rollback
-- instead of deleting them silently.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "quack" WHERE "parentId" IS NOT NULL OR "deletedAt" IS NOT NULL) THEN
    RAISE EXCEPTION 'quack has replies or placeholders; roll back by hand after deciding what happens to them';
  END IF;
END $$;

ALTER TABLE "quack" DROP CONSTRAINT "quack_placeholder_empty_check";
ALTER TABLE "quack" DROP CONSTRAINT "quack_thread_pointers_check";
ALTER TABLE "quack" DROP CONSTRAINT "quack_rootId_fkey";
ALTER TABLE "quack" DROP CONSTRAINT "quack_parentId_fkey";
ALTER TABLE "quack" DROP CONSTRAINT "quack_userId_fkey";
DROP INDEX "quack_rootId_createdAt_idx";
DROP INDEX "quack_parentId_idx";
-- A quack whose author was removed after the migration has no userId any more.
DELETE FROM "quack" WHERE "userId" IS NULL;
ALTER TABLE "quack"
  DROP COLUMN "rootId",
  DROP COLUMN "parentId",
  DROP COLUMN "deletedAt",
  ALTER COLUMN "text" SET NOT NULL,
  ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "quack" ADD CONSTRAINT "quack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
