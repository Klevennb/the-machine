import type { EntryVisibility, Prisma, PrismaClient } from "@prisma/client";
import { invariantString } from "@/lib/invariant";

export const STORY_BATCH_SIZE = 8;

export type StorySource = "random" | "friends";
export type StoryVisibility = "PRIVATE" | "FRIENDS" | "PUBLIC";

type DbClient = PrismaClient | Prisma.TransactionClient;

export function isStoryVisibility(value: unknown): value is StoryVisibility {
  return value === "PRIVATE" || value === "FRIENDS" || value === "PUBLIC";
}

export async function areAcceptedFriends({
  db,
  userId,
  otherUserId,
}: {
  db: DbClient;
  userId: string;
  otherUserId: string;
}) {
  invariantString(userId, "userId");
  invariantString(otherUserId, "otherUserId");

  if (userId === otherUserId) {
    return true;
  }

  const friendship = await db.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        {
          requesterId: userId,
          addresseeId: otherUserId,
        },
        {
          requesterId: otherUserId,
          addresseeId: userId,
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return Boolean(friendship);
}

export async function getAcceptedFriendIds(db: DbClient, userId: string) {
  invariantString(userId, "userId");

  const friendships = await db.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        {
          requesterId: userId,
        },
        {
          addresseeId: userId,
        },
      ],
    },
    select: {
      requesterId: true,
      addresseeId: true,
    },
  });

  return friendships.map((friendship) =>
    friendship.requesterId === userId
      ? friendship.addresseeId
      : friendship.requesterId
  );
}

export async function canViewStory({
  db,
  entry,
  viewerId,
}: {
  db: DbClient;
  entry: {
    authorId: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    visibility: EntryVisibility;
  };
  viewerId: string;
}) {
  invariantString(viewerId, "viewerId");

  if (entry.authorId === viewerId) {
    return true;
  }

  if (entry.status !== "PUBLISHED") {
    return false;
  }

  if (entry.visibility === "PUBLIC") {
    return true;
  }

  if (entry.visibility === "FRIENDS") {
    return areAcceptedFriends({
      db,
      otherUserId: entry.authorId,
      userId: viewerId,
    });
  }

  return false;
}

export async function getProfileStoryVisibilityFilter({
  db,
  profileUserId,
  viewerId,
}: {
  db: DbClient;
  profileUserId: string;
  viewerId: string;
}): Promise<Prisma.EntryWhereInput["visibility"]> {
  invariantString(profileUserId, "profileUserId");
  invariantString(viewerId, "viewerId");

  if (profileUserId === viewerId) {
    return {
      in: ["PRIVATE", "FRIENDS", "PUBLIC"],
    };
  }

  const isFriend = await areAcceptedFriends({
    db,
    otherUserId: profileUserId,
    userId: viewerId,
  });

  return isFriend
    ? {
        in: ["FRIENDS", "PUBLIC"],
      }
    : "PUBLIC";
}

function shuffle<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

export async function getExploreStories({
  db,
  excludeIds,
  includeNsfw,
  source,
  viewerId,
}: {
  db: DbClient;
  excludeIds: string[];
  includeNsfw: boolean;
  source: StorySource;
  viewerId: string;
}) {
  invariantString(viewerId, "viewerId");

  const friendIds =
    source === "friends" ? await getAcceptedFriendIds(db, viewerId) : [];

  if (source === "friends" && friendIds.length === 0) {
    return [];
  }

  const candidates = await db.entry.findMany({
    where: {
      authorId:
        source === "friends"
          ? {
              in: friendIds,
            }
          : {
              not: viewerId,
            },
      hiddenBy: {
        none: {
          userId: viewerId,
        },
      },
      id:
        excludeIds.length > 0
          ? {
              notIn: excludeIds,
            }
          : undefined,
      isNsfw: includeNsfw ? undefined : false,
      status: "PUBLISHED",
      visibility:
        source === "friends"
          ? {
              in: ["FRIENDS", "PUBLIC"],
            }
          : "PUBLIC",
    },
    select: {
      id: true,
      title: true,
      summary: true,
      plainText: true,
      wordCount: true,
      storyGenre: true,
      customStoryGenre: true,
      visibility: true,
      isNsfw: true,
      publishedAt: true,
      contestEntry: { select: { status: true, contest: { select: { contestDate: true } } } },
      author: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  });

  return shuffle(candidates).slice(0, STORY_BATCH_SIZE);
}
