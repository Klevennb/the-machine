import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getDisplayName(user: { name: string | null; username: string | null }) {
  return user.name?.trim() || user.username?.trim() || "Unnamed writer";
}

export async function GET(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return Response.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        not: userId,
      },
      OR: [
        {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          username: {
            contains: query,
            mode: "insensitive",
          },
        },
      ],
    },
    orderBy: [
      {
        username: "asc",
      },
      {
        name: "asc",
      },
    ],
    take: 12,
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      profileVisibility: true,
      sentFriendRequests: {
        where: {
          addresseeId: userId,
        },
        select: {
          id: true,
          status: true,
          requesterId: true,
          addresseeId: true,
        },
      },
      receivedFriends: {
        where: {
          requesterId: userId,
        },
        select: {
          id: true,
          status: true,
          requesterId: true,
          addresseeId: true,
        },
      },
    },
  });

  return Response.json({
    users: users.map((user) => {
      const relationship =
        user.sentFriendRequests[0] ?? user.receivedFriends[0] ?? null;

      return {
        id: user.id,
        displayName: getDisplayName(user),
        username: user.username,
        bio: user.bio,
        profileVisibility: user.profileVisibility,
        relationship: relationship
          ? {
              id: relationship.id,
              status: relationship.status,
              direction:
                relationship.requesterId === userId ? "outgoing" : "incoming",
            }
          : null,
      };
    }),
  });
}
