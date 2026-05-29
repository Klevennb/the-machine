import { Prisma, ProfileVisibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { syncActiveWordGoal } from "@/lib/writing-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROFILE_VISIBILITIES = [
  ProfileVisibility.PRIVATE,
  ProfileVisibility.MEMBERS,
  ProfileVisibility.PUBLIC,
] as const;
const MAX_GENRES = 8;

type ProfilePayload = {
  name?: string;
  username?: string;
  bio?: string;
  timezone?: string;
  profileVisibility?: string;
  showEmailOnProfile?: boolean;
  allowNsfwStories?: boolean;
  favoriteGenres?: string[];
  mutedGenres?: string[];
  feedIncludesPublic?: boolean;
  feedIncludesFriends?: boolean;
  feedIncludesPrompts?: boolean;
  dailyTargetWords?: number;
  streakGoalDays?: number;
  showProfileSection?: boolean;
  showPreferencesSection?: boolean;
  showFeedSection?: boolean;
  showGoalsSection?: boolean;
  showFriendsSection?: boolean;
};

function cleanOptionalString(value: string | undefined, maxLength: number) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function cleanGenreList(value: string[] | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const genres = value
    .map((genre) => genre.trim())
    .filter(Boolean)
    .slice(0, MAX_GENRES);

  return Array.from(new Set(genres));
}

function cleanBoolean(value: boolean | undefined) {
  return value;
}

function cleanNumber(
  value: number | undefined,
  defaultValue: number,
  maxValue: number
) {
  if (value === undefined) {
    return undefined;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return defaultValue;
  }

  return Math.min(maxValue, Math.max(1, Math.round(numericValue)));
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ProfilePayload;
  const username = cleanOptionalString(body.username, 32);

  if (
    username &&
    !/^[a-zA-Z0-9_]+$/.test(username)
  ) {
    return Response.json(
      { error: "Username can only use letters, numbers, and underscores." },
      { status: 400 }
    );
  }

  const profileVisibility =
    typeof body.profileVisibility === "string" &&
    PROFILE_VISIBILITIES.includes(body.profileVisibility as ProfileVisibility)
      ? (body.profileVisibility as ProfileVisibility)
      : undefined;
  const dailyTargetWords = cleanNumber(body.dailyTargetWords, 500, 50000);
  const streakGoalDays = cleanNumber(body.streakGoalDays, 7, 365);
  const shouldSyncWordGoal =
    dailyTargetWords !== undefined || streakGoalDays !== undefined;

  try {
    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          name: cleanOptionalString(body.name, 80),
          username,
          bio: cleanOptionalString(body.bio, 500),
          timezone: cleanOptionalString(body.timezone, 80) ?? undefined,
          profileVisibility,
          isProfilePublic:
            profileVisibility === undefined
              ? undefined
              : profileVisibility === ProfileVisibility.PUBLIC,
          showEmailOnProfile: cleanBoolean(body.showEmailOnProfile),
          allowNsfwStories: cleanBoolean(body.allowNsfwStories),
          favoriteGenres: cleanGenreList(body.favoriteGenres),
          mutedGenres: cleanGenreList(body.mutedGenres),
          feedIncludesPublic: cleanBoolean(body.feedIncludesPublic),
          feedIncludesFriends: cleanBoolean(body.feedIncludesFriends),
          feedIncludesPrompts: cleanBoolean(body.feedIncludesPrompts),
          dailyTargetWords,
          streakGoalDays,
          showProfileSection: cleanBoolean(body.showProfileSection),
          showPreferencesSection: cleanBoolean(body.showPreferencesSection),
          showFeedSection: cleanBoolean(body.showFeedSection),
          showGoalsSection: cleanBoolean(body.showGoalsSection),
          showFriendsSection: cleanBoolean(body.showFriendsSection),
        },
        select: {
          id: true,
          name: true,
          username: true,
          bio: true,
          email: true,
          timezone: true,
          profileVisibility: true,
          showEmailOnProfile: true,
          allowNsfwStories: true,
          favoriteGenres: true,
          mutedGenres: true,
          feedIncludesPublic: true,
          feedIncludesFriends: true,
          feedIncludesPrompts: true,
          dailyTargetWords: true,
          streakGoalDays: true,
          showProfileSection: true,
          showPreferencesSection: true,
          showFeedSection: true,
          showGoalsSection: true,
          showFriendsSection: true,
          updatedAt: true,
        },
      });

      if (shouldSyncWordGoal) {
        await syncActiveWordGoal(tx, userId, {
          dailyTargetWords: updatedUser.dailyTargetWords,
          streakGoalDays: updatedUser.streakGoalDays,
        });
      }

      return updatedUser;
    });

    return Response.json({ user });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json({ error: "Username is already taken." }, { status: 409 });
    }

    throw error;
  }
}
