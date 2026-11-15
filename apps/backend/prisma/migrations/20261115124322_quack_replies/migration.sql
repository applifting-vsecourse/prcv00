-- DropForeignKey
ALTER TABLE "quack" DROP CONSTRAINT "quack_userId_fkey";

-- AlterTable
ALTER TABLE "quack" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "rootId" TEXT,
ALTER COLUMN "text" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "quack_parentId_idx" ON "quack"("parentId");

-- CreateIndex
CREATE INDEX "quack_rootId_createdAt_idx" ON "quack"("rootId", "createdAt");

-- AddForeignKey
ALTER TABLE "quack" ADD CONSTRAINT "quack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quack" ADD CONSTRAINT "quack_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "quack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quack" ADD CONSTRAINT "quack_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "quack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Written by hand: Prisma can't express CHECK constraints (it leaves them
-- alone afterwards). They make the rules of docs/adr/0002 hold even for a
-- write that bypasses the service.

-- A reply has both pointers, a quack that starts a conversation has neither.
ALTER TABLE "quack" ADD CONSTRAINT "quack_thread_pointers_check"
  CHECK (("parentId" IS NULL) = ("rootId" IS NULL));

-- A placeholder keeps no content and no author; a live quack always has text.
-- A new content column on quack belongs in the ELSE branch.
ALTER TABLE "quack" ADD CONSTRAINT "quack_placeholder_empty_check"
  CHECK (CASE WHEN "deletedAt" IS NULL
              THEN "text" IS NOT NULL
              ELSE "text" IS NULL AND "userId" IS NULL AND "mood" IS NULL
                   AND cardinality("hashtags") = 0 END);
