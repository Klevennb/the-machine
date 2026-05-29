import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GoalPayload = {
  title?: string;
  description?: string;
};

function cleanString(value: string | undefined, maxLength: number) {
  if (value === undefined) {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function cleanOptionalString(value: string | undefined, maxLength: number) {
  const normalized = cleanString(value, maxLength);
  return normalized || null;
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();

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
