import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EntryVisibilityPayload = {
  visibility?: "PRIVATE" | "PUBLIC";
};

type EntryRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: EntryRouteContext) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as EntryVisibilityPayload;

  if (body.visibility !== "PRIVATE" && body.visibility !== "PUBLIC") {
    return Response.json({ error: "Invalid visibility" }, { status: 400 });
  }

  const existingEntry = await prisma.entry.findFirst({
    where: {
      id,
      authorId: userId,
    },
    select: {
      id: true,
      publishedAt: true,
    },
  });

  if (!existingEntry) {
    return Response.json({ error: "Entry not found" }, { status: 404 });
  }

  const entry = await prisma.entry.update({
    where: {
      id: existingEntry.id,
    },
    data: {
      visibility: body.visibility,
      status: "PUBLISHED",
      publishedAt: existingEntry.publishedAt ?? new Date(),
    },
    select: {
      id: true,
      visibility: true,
      status: true,
      updatedAt: true,
      publishedAt: true,
    },
  });

  return Response.json({ entry });
}
