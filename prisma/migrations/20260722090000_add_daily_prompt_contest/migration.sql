CREATE TYPE "ContestPromptSource" AS ENUM ('BUILT_IN', 'COMMUNITY');
CREATE TYPE "ContestQueueStatus" AS ENUM ('QUEUED', 'USED', 'CANCELLED');
CREATE TYPE "ContestEntryStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'DISQUALIFIED');

ALTER TABLE "User" ADD COLUMN "showNsfwContestEntries" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "hideDailyContestCard" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "DailyContest" (
  "id" TEXT NOT NULL, "contestDate" DATE NOT NULL, "promptTitle" TEXT NOT NULL,
  "promptBody" TEXT NOT NULL, "promptGenre" TEXT NOT NULL, "promptSource" "ContestPromptSource" NOT NULL,
  "sourcePromptId" TEXT NOT NULL, "submissionsOpenAt" TIMESTAMP(3) NOT NULL,
  "submissionsCloseAt" TIMESTAMP(3) NOT NULL, "votingCloseAt" TIMESTAMP(3) NOT NULL,
  "winnerEntryId" TEXT, "finalizedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "DailyContest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ContestPromptQueueItem" (
  "id" TEXT NOT NULL, "builtInPromptId" TEXT, "writingPromptId" TEXT, "scheduledDate" DATE,
  "position" INTEGER NOT NULL, "status" "ContestQueueStatus" NOT NULL DEFAULT 'QUEUED', "createdById" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContestPromptQueueItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContestPromptQueueItem_exactly_one_prompt" CHECK (("builtInPromptId" IS NOT NULL) <> ("writingPromptId" IS NOT NULL))
);
CREATE TABLE "ContestEntry" (
  "id" TEXT NOT NULL, "contestId" TEXT NOT NULL, "entryId" TEXT NOT NULL, "authorId" TEXT NOT NULL,
  "status" "ContestEntryStatus" NOT NULL DEFAULT 'ACTIVE', "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "withdrawnAt" TIMESTAMP(3), "disqualifiedAt" TIMESTAMP(3), "disqualifiedById" TEXT, "adminNotes" TEXT,
  "voteCount" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "ContestEntry_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ContestVote" (
  "id" TEXT NOT NULL, "contestId" TEXT NOT NULL, "contestEntryId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContestVote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DailyContest_contestDate_key" ON "DailyContest"("contestDate");
CREATE UNIQUE INDEX "DailyContest_winnerEntryId_key" ON "DailyContest"("winnerEntryId");
CREATE INDEX "DailyContest_votingCloseAt_finalizedAt_idx" ON "DailyContest"("votingCloseAt", "finalizedAt");
CREATE INDEX "ContestPromptQueueItem_status_scheduledDate_position_idx" ON "ContestPromptQueueItem"("status", "scheduledDate", "position");
CREATE UNIQUE INDEX "ContestEntry_entryId_key" ON "ContestEntry"("entryId");
CREATE UNIQUE INDEX "ContestEntry_contestId_authorId_key" ON "ContestEntry"("contestId", "authorId");
CREATE INDEX "ContestEntry_contestId_status_voteCount_submittedAt_idx" ON "ContestEntry"("contestId", "status", "voteCount", "submittedAt");
CREATE UNIQUE INDEX "ContestVote_contestId_userId_key" ON "ContestVote"("contestId", "userId");
CREATE INDEX "ContestVote_contestEntryId_idx" ON "ContestVote"("contestEntryId");
ALTER TABLE "ContestPromptQueueItem" ADD CONSTRAINT "ContestPromptQueueItem_builtInPromptId_fkey" FOREIGN KEY ("builtInPromptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestPromptQueueItem" ADD CONSTRAINT "ContestPromptQueueItem_writingPromptId_fkey" FOREIGN KEY ("writingPromptId") REFERENCES "WritingPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestPromptQueueItem" ADD CONSTRAINT "ContestPromptQueueItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "DailyContest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestVote" ADD CONSTRAINT "ContestVote_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "DailyContest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestVote" ADD CONSTRAINT "ContestVote_contestEntryId_fkey" FOREIGN KEY ("contestEntryId") REFERENCES "ContestEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestVote" ADD CONSTRAINT "ContestVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyContest" ADD CONSTRAINT "DailyContest_winnerEntryId_fkey" FOREIGN KEY ("winnerEntryId") REFERENCES "ContestEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
