ALTER TABLE "Entry"
ADD COLUMN "storyGenre" TEXT,
ADD COLUMN "customStoryGenre" TEXT,
ADD COLUMN "sourceContestId" TEXT,
ADD COLUMN "sourcePromptTitle" TEXT,
ADD COLUMN "sourcePromptBody" TEXT,
ADD COLUMN "sourcePromptGenre" TEXT;

CREATE TABLE "ContestDraft" (
  "id" TEXT NOT NULL,
  "contestId" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContestDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContestDraft_entryId_key" ON "ContestDraft"("entryId");
CREATE UNIQUE INDEX "ContestDraft_contestId_authorId_key" ON "ContestDraft"("contestId", "authorId");
CREATE INDEX "ContestDraft_authorId_updatedAt_idx" ON "ContestDraft"("authorId", "updatedAt");
CREATE INDEX "Entry_sourceContestId_idx" ON "Entry"("sourceContestId");

ALTER TABLE "Entry"
ADD CONSTRAINT "Entry_sourceContestId_fkey"
FOREIGN KEY ("sourceContestId") REFERENCES "DailyContest"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContestDraft"
ADD CONSTRAINT "ContestDraft_contestId_fkey"
FOREIGN KEY ("contestId") REFERENCES "DailyContest"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContestDraft"
ADD CONSTRAINT "ContestDraft_entryId_fkey"
FOREIGN KEY ("entryId") REFERENCES "Entry"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContestDraft"
ADD CONSTRAINT "ContestDraft_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
