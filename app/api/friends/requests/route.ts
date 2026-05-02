import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateFriendRequestPayload = {
  addresseeId?: string;
  message?: string;
};

function getSessionUserId(session: unknown) {
  return (session as { user?: { id?: string } } | null)?.user?.id ?? null;
}

function getDisplayName(user: { name: string | null; username: string | null }) {
  return user.name?.trim() || user.username?.trim() || "Unnamed writer";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await prisma.friendship.findMany({
    where: {
      addresseeId: userId,
      status: "PENDING",
      ignoredAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      message: true,
      createdAt: true,
      requester: {
        select: {
          id: true,
          name: true,
          username: true,
          bio: true,
        },
      },
    },
  });

  return Response.json({
    requests: requests.map((request) => ({
      id: request.id,
      message: request.message,
      createdAt: request.createdAt.toISOString(),
      requester: {
        id: request.requester.id,
        displayName: getDisplayName(request.requester),
        username: request.requester.username,
        bio: request.requester.bio,
      },
    })),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateFriendRequestPayload;
  const addresseeId = body.addresseeId?.trim();
  const message = body.message?.trim() ?? "";

  if (!addresseeId) {
    return Response.json({ error: "Choose a writer first." }, { status: 400 });
  }

  if (addresseeId === userId) {
    return Response.json(
      { error: "You cannot send a friend request to yourself." },
      { status: 400 }
    );
  }

  if (message.length > 500) {
    return Response.json(
      { error: "Friend request messages must be 500 characters or fewer." },
      { status: 400 }
    );
  }

  const addressee = await prisma.user.findUnique({
    where: {
      id: addresseeId,
    },
    select: {
      id: true,
    },
  });

  if (!addressee) {
    return Response.json({ error: "Writer not found." }, { status: 404 });
  }

  const existingRelationship = await prisma.friendship.findFirst({
    where: {
      OR: [
        {
          requesterId: userId,
          addresseeId,
        },
        {
          requesterId: addresseeId,
          addresseeId: userId,
        },
      ],
    },
    select: {
      id: true,
      requesterId: true,
      status: true,
    },
  });

  if (existingRelationship?.status === "ACCEPTED") {
    return Response.json(
      { error: "You are already friends with this writer." },
      { status: 409 }
    );
  }

  if (existingRelationship?.status === "PENDING") {
    return Response.json(
      {
        error:
          existingRelationship.requesterId === userId
            ? "You already sent this writer a request."
            : "This writer already sent you a request.",
      },
      { status: 409 }
    );
  }

  const friendRequest = await prisma.friendship.create({
    data: {
      requesterId: userId,
      addresseeId,
      message: message || null,
    },
    select: {
      id: true,
      status: true,
    },
  });

  return Response.json({ request: friendRequest }, { status: 201 });
}
