import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GoalPayload = {
  title?: unknown;
  description?: unknown;
};

function getSessionUserId(session: unknown) {
  return (session as { user?: { id?: string } } | null)?.user?.id ?? null;
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function cleanOptionalString(value: unknown, maxLength: number) {
  const normalized = cleanString(value, maxLength);
  return normalized || null;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as GoalPayload;
  const title = cleanString(body.title, 80);

  if (!title) {
    return Response.json({ error: "Goal title is required." }, { status: 400 });
  }

  const goal = await prisma.customGoal.create({
    data: {
      userId,
      title,
      description: cleanOptionalString(body.description, 240),
    },
    select: {
      id: true,
      title: true,
      description: true,
      isCompleted: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return Response.json({ goal }, { status: 201 });
}
