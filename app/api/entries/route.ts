import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.entry.findMany({
    where: {
      authorId: userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      title: true,
      summary: true,
      plainText: true,
      wordCount: true,
      privateAuthorNote: true,
      publicAuthorNote: true,
      visibility: true,
      isNsfw: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
    },
  });

  return Response.json({ entries });
}
