import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GoalPayload = {
  title?: unknown;
  description?: unknown;
  dailyTargetWords?: unknown;
  isActive?: unknown;
};

type GoalRouteContext = {
  params: Promise<{ id: string }>;
};

function getSessionUserId(session: unknown) {
  return (session as { user?: { id?: string } } | null)?.user?.id ?? null;
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim().slice(0, maxLength);
}

function cleanOptionalString(value: unknown, maxLength: number) {
  const normalized = cleanString(value, maxLength);
  return normalized ? normalized : null;
}

function cleanTargetWords(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Math.min(50000, Math.max(1, Math.round(numericValue)));
}

export async function PATCH(request: Request, context: GoalRouteContext) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as GoalPayload;
  const title = cleanString(body.title, 80);
  const dailyTargetWords = cleanTargetWords(body.dailyTargetWords);

  if (title !== undefined && !title) {
    return Response.json({ error: "Goal title is required." }, { status: 400 });
  }

  if (dailyTargetWords === null) {
    return Response.json(
      { error: "Daily target must be a valid number." },
      { status: 400 }
    );
  }

  const existingGoal = await prisma.wordGoal.findFirst({
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

  const goal = await prisma.wordGoal.update({
    where: {
      id: existingGoal.id,
    },
    data: {
      title,
      description:
        body.description === undefined
          ? undefined
          : cleanOptionalString(body.description, 240),
      dailyTargetWords: dailyTargetWords ?? undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    },
    select: {
      id: true,
      title: true,
      description: true,
      dailyTargetWords: true,
      isActive: true,
      currentStreakDays: true,
      bestStreakDays: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return Response.json({ goal });
}
