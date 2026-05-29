import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GoalPayload = {
  title?: string;
  description?: string;
  isCompleted?: boolean;
};

type GoalRouteContext = {
  params: Promise<{ id: string }>;
};

function cleanString(value: string | undefined, maxLength: number) {
  if (value === undefined) {
    return undefined;
  }

  return value.trim().slice(0, maxLength);
}

function cleanOptionalString(value: string | undefined, maxLength: number) {
  const normalized = cleanString(value, maxLength);
  return normalized ? normalized : null;
}

export async function PATCH(request: Request, context: GoalRouteContext) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as GoalPayload;
  const title = cleanString(body.title, 80);

  if (title !== undefined && !title) {
    return Response.json({ error: "Goal title is required." }, { status: 400 });
  }

  const existingGoal = await prisma.customGoal.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingGoal) {
    return Response.json({ error: "Goal not found." }, { status: 404 });
  }

  const isCompleted =
    typeof body.isCompleted === "boolean" ? body.isCompleted : undefined;

  const goal = await prisma.customGoal.update({
    where: {
      id: existingGoal.id,
    },
    data: {
      title,
      description:
        body.description === undefined
          ? undefined
          : cleanOptionalString(body.description, 240),
      isCompleted,
      completedAt:
        isCompleted === undefined ? undefined : isCompleted ? new Date() : null,
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

  return Response.json({ goal });
}

export async function DELETE(_request: Request, context: GoalRouteContext) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const existingGoal = await prisma.customGoal.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingGoal) {
    return Response.json({ error: "Goal not found." }, { status: 404 });
  }

  await prisma.customGoal.delete({
    where: {
      id: existingGoal.id,
    },
  });

  return Response.json({ goal: { id: existingGoal.id } });
}
