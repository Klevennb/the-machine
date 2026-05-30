CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

CREATE TYPE "FeedbackCategory" AS ENUM ('BUG', 'CONTENT_REQUEST', 'FEATURE_REQUEST', 'GENERAL');

CREATE TYPE "RewardStatus" AS ENUM ('NOT_ELIGIBLE', 'ELIGIBLE', 'REWARDED', 'DISQUALIFIED');

CREATE TABLE "FeedbackSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "FeedbackCategory" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WritingPrompt" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "normalizedGenre" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "popularityScore" INTEGER NOT NULL DEFAULT 0,
    "rewardStatus" "RewardStatus" NOT NULL DEFAULT 'NOT_ELIGIBLE',
    "rewardedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingPrompt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromptVote" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromptUsageEvent" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'USE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FeedbackSubmission_status_createdAt_idx" ON "FeedbackSubmission"("status", "createdAt");
CREATE INDEX "FeedbackSubmission_userId_createdAt_idx" ON "FeedbackSubmission"("userId", "createdAt");
CREATE INDEX "WritingPrompt_status_normalizedGenre_popularityScore_idx" ON "WritingPrompt"("status", "normalizedGenre", "popularityScore");
CREATE INDEX "WritingPrompt_authorId_createdAt_idx" ON "WritingPrompt"("authorId", "createdAt");
CREATE INDEX "WritingPrompt_rewardStatus_popularityScore_idx" ON "WritingPrompt"("rewardStatus", "popularityScore");
CREATE UNIQUE INDEX "PromptVote_promptId_userId_key" ON "PromptVote"("promptId", "userId");
CREATE INDEX "PromptVote_userId_createdAt_idx" ON "PromptVote"("userId", "createdAt");
CREATE INDEX "PromptUsageEvent_promptId_createdAt_idx" ON "PromptUsageEvent"("promptId", "createdAt");
CREATE INDEX "PromptUsageEvent_userId_createdAt_idx" ON "PromptUsageEvent"("userId", "createdAt");

ALTER TABLE "FeedbackSubmission" ADD CONSTRAINT "FeedbackSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingPrompt" ADD CONSTRAINT "WritingPrompt_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptVote" ADD CONSTRAINT "PromptVote_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "WritingPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptVote" ADD CONSTRAINT "PromptVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptUsageEvent" ADD CONSTRAINT "PromptUsageEvent_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "WritingPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptUsageEvent" ADD CONSTRAINT "PromptUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
