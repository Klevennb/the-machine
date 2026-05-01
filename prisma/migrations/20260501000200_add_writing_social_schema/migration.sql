-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "EntryVisibility" AS ENUM ('PRIVATE', 'FRIENDS', 'PUBLIC');

-- CreateEnum
CREATE TYPE "CommentPolicy" AS ENUM ('ENABLED', 'FRIENDS_ONLY', 'DISABLED');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isProfilePublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "username" TEXT;

UPDATE "User"
SET "updatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)
WHERE "updatedAt" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateTable
CREATE TABLE "WordGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dailyTargetWords" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "currentStreakDays" INTEGER NOT NULL DEFAULT 0,
    "bestStreakDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "wordsWritten" INTEGER NOT NULL DEFAULT 0,
    "targetWords" INTEGER NOT NULL,
    "goalMet" BOOLEAN NOT NULL DEFAULT false,
    "streakDayNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "tags" TEXT[],
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPromptAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "UserPromptAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntrySeries" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "visibility" "EntryVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntrySeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "seriesId" TEXT,
    "promptId" TEXT,
    "title" TEXT,
    "slug" TEXT,
    "summary" TEXT,
    "plainText" TEXT,
    "content" JSONB,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "privateAuthorNote" TEXT,
    "publicAuthorNote" TEXT,
    "visibility" "EntryVisibility" NOT NULL DEFAULT 'PRIVATE',
    "commentPolicy" "CommentPolicy" NOT NULL DEFAULT 'ENABLED',
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "isStandalone" BOOLEAN NOT NULL DEFAULT true,
    "firstSubmittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryProgressCredit" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "dailyProgressId" TEXT NOT NULL,
    "creditedDate" TIMESTAMP(3) NOT NULL,
    "creditedWords" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryProgressCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryLike" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryComment" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "body" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntryComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WordGoal_userId_isActive_idx" ON "WordGoal"("userId", "isActive");

-- CreateIndex
CREATE INDEX "DailyProgress_goalId_date_idx" ON "DailyProgress"("goalId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyProgress_userId_date_key" ON "DailyProgress"("userId", "date");

-- CreateIndex
CREATE INDEX "Prompt_genre_isFeatured_idx" ON "Prompt"("genre", "isFeatured");

-- CreateIndex
CREATE INDEX "UserPromptAssignment_userId_assignedAt_idx" ON "UserPromptAssignment"("userId", "assignedAt");

-- CreateIndex
CREATE INDEX "UserPromptAssignment_promptId_idx" ON "UserPromptAssignment"("promptId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPromptAssignment_userId_promptId_assignedAt_key" ON "UserPromptAssignment"("userId", "promptId", "assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EntrySeries_slug_key" ON "EntrySeries"("slug");

-- CreateIndex
CREATE INDEX "EntrySeries_authorId_createdAt_idx" ON "EntrySeries"("authorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_slug_key" ON "Entry"("slug");

-- CreateIndex
CREATE INDEX "Entry_authorId_createdAt_idx" ON "Entry"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "Entry_seriesId_createdAt_idx" ON "Entry"("seriesId", "createdAt");

-- CreateIndex
CREATE INDEX "Entry_visibility_status_publishedAt_idx" ON "Entry"("visibility", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Entry_promptId_idx" ON "Entry"("promptId");

-- CreateIndex
CREATE INDEX "EntryProgressCredit_dailyProgressId_creditedDate_idx" ON "EntryProgressCredit"("dailyProgressId", "creditedDate");

-- CreateIndex
CREATE UNIQUE INDEX "EntryProgressCredit_entryId_dailyProgressId_key" ON "EntryProgressCredit"("entryId", "dailyProgressId");

-- CreateIndex
CREATE INDEX "EntryLike_userId_createdAt_idx" ON "EntryLike"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EntryLike_entryId_userId_key" ON "EntryLike"("entryId", "userId");

-- CreateIndex
CREATE INDEX "EntryComment_entryId_createdAt_idx" ON "EntryComment"("entryId", "createdAt");

-- CreateIndex
CREATE INDEX "EntryComment_authorId_createdAt_idx" ON "EntryComment"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "EntryComment_parentCommentId_idx" ON "EntryComment"("parentCommentId");

-- CreateIndex
CREATE INDEX "Friendship_addresseeId_status_idx" ON "Friendship"("addresseeId", "status");

-- CreateIndex
CREATE INDEX "Friendship_requesterId_status_idx" ON "Friendship"("requesterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordGoal" ADD CONSTRAINT "WordGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyProgress" ADD CONSTRAINT "DailyProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyProgress" ADD CONSTRAINT "DailyProgress_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "WordGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPromptAssignment" ADD CONSTRAINT "UserPromptAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPromptAssignment" ADD CONSTRAINT "UserPromptAssignment_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrySeries" ADD CONSTRAINT "EntrySeries_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "EntrySeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryProgressCredit" ADD CONSTRAINT "EntryProgressCredit_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryProgressCredit" ADD CONSTRAINT "EntryProgressCredit_dailyProgressId_fkey" FOREIGN KEY ("dailyProgressId") REFERENCES "DailyProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryLike" ADD CONSTRAINT "EntryLike_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryLike" ADD CONSTRAINT "EntryLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryComment" ADD CONSTRAINT "EntryComment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryComment" ADD CONSTRAINT "EntryComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryComment" ADD CONSTRAINT "EntryComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "EntryComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

