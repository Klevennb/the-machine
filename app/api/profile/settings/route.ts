import { getServerSession } from "next-auth";
import { Prisma, ProfileVisibility } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROFILE_VISIBILITIES = [
  ProfileVisibility.PRIVATE,
  ProfileVisibility.MEMBERS,
  ProfileVisibility.PUBLIC,
] as const;
const MAX_GENRES = 8;

type ProfilePayload = {
  name?: unknown;
  username?: unknown;
  bio?: unknown;
  timezone?: unknown;
  profileVisibility?: unknown;
  showEmailOnProfile?: unknown;
  allowNsfwStories?: unknown;
  favoriteGenres?: unknown;
  mutedGenres?: unknown;
  feedIncludesPublic?: unknown;
  feedIncludesFriends?: unknown;
  feedIncludesPrompts?: unknown;
  dailyTargetWords?: unknown;
  streakGoalDays?: unknown;
  showProfileSection?: unknown;
  showPreferencesSection?: unknown;
  showFeedSection?: unknown;
  showGoalsSection?: unknown;
  showFriendsSection?: unknown;
};

function getSessionUserId(session: unknown) {
  return (session as { user?: { id?: string } } | null)?.user?.id ?? null;
}

function cleanOptionalString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function cleanGenreList(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const genres = value
    .filter((genre): genre is string => typeof genre === "string")
    .map((genre) => genre.trim())
    .filter(Boolean)
    .slice(0, MAX_GENRES);

  return Array.from(new Set(genres));
}

function cleanBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function cleanNumber(value: unknown, defaultValue: number, maxValue: number) {
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
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);

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

  try {
    const user = await prisma.user.update({
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
        dailyTargetWords: cleanNumber(body.dailyTargetWords, 500, 50000),
        streakGoalDays: cleanNumber(body.streakGoalDays, 7, 365),
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
