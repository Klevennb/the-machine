-- Add a Clerk identity link while keeping existing local users and data intact.
ALTER TABLE "User" ADD COLUMN "clerkId" TEXT;
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");
