-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PRIVATE', 'MEMBERS', 'PUBLIC');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allowNsfwStories" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "favoriteGenres" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "feedIncludesFriends" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "feedIncludesPrompts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "feedIncludesPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mutedGenres" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "showEmailOnProfile" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "profileVisibility" = CASE
  WHEN "isProfilePublic" = true THEN 'PUBLIC'::"ProfileVisibility"
  ELSE 'PRIVATE'::"ProfileVisibility"
END;
