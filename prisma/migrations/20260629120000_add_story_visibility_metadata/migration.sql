-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "isNsfw" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "HiddenEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "hiddenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiddenEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HiddenEntry_userId_hiddenAt_idx" ON "HiddenEntry"("userId", "hiddenAt");

-- CreateIndex
CREATE INDEX "HiddenEntry_userId_entryId_idx" ON "HiddenEntry"("userId", "entryId");

-- CreateIndex
CREATE UNIQUE INDEX "HiddenEntry_userId_entryId_key" ON "HiddenEntry"("userId", "entryId");

-- AddForeignKey
ALTER TABLE "HiddenEntry" ADD CONSTRAINT "HiddenEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiddenEntry" ADD CONSTRAINT "HiddenEntry_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
