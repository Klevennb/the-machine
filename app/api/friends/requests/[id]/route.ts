import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UpdateFriendRequestPayload = {
  action?: "accept" | "deny" | "ignore";
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as UpdateFriendRequestPayload;

  const friendRequest = await prisma.friendship.findFirst({
    where: {
      id,
      addresseeId: userId,
      status: "PENDING",
    },
    select: {
      id: true,
    },
  });

  if (!friendRequest) {
    return Response.json({ error: "Friend request not found." }, { status: 404 });
  }

  if (body.action === "accept") {
    const acceptedRequest = await prisma.friendship.update({
      where: {
        id: friendRequest.id,
      },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        ignoredAt: null,
      },
      select: {
        id: true,
        status: true,
        acceptedAt: true,
      },
    });

    return Response.json({ request: acceptedRequest });
  }

  if (body.action === "deny") {
    await prisma.friendship.delete({
      where: {
        id: friendRequest.id,
      },
    });

    return Response.json({ request: { id: friendRequest.id, status: "DENIED" } });
  }

  if (body.action === "ignore") {
    const ignoredRequest = await prisma.friendship.update({
      where: {
        id: friendRequest.id,
      },
      data: {
        ignoredAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        ignoredAt: true,
      },
    });

    return Response.json({ request: ignoredRequest });
  }

  return Response.json({ error: "Choose accept, deny, or ignore." }, { status: 400 });
}
