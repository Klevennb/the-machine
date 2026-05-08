ALTER TABLE "User"
ADD COLUMN "dailyTargetWords" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN "streakGoalDays" INTEGER NOT NULL DEFAULT 7;

CREATE TABLE "CustomGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomGoal_pkey" PRIMARY KEY ("id")
);

INSERT INTO "CustomGoal" (
    "id",
    "userId",
    "title",
    "description",
    "isCompleted",
    "completedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "userId",
    "title",
    "description",
    false,
    NULL,
    "createdAt",
    "updatedAt"
FROM "WordGoal";

CREATE INDEX "CustomGoal_userId_isCompleted_createdAt_idx"
ON "CustomGoal"("userId", "isCompleted", "createdAt");

ALTER TABLE "CustomGoal"
ADD CONSTRAINT "CustomGoal_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
