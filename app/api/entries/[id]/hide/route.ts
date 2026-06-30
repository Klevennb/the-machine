import { apiError, apiSuccess, createRequestId, logApiError } from "@/lib/api-response";
import { invariant, invariantString } from "@/lib/invariant";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HideRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: HideRouteContext) {
  invariant(context.params instanceof Promise, "context params must be a Promise.");

  const requestId = createRequestId();
  let userId: string | null = null;
  let entryId: string | null = null;

  try {
    userId = await getCurrentUserId();

    if (!userId) {
      return apiError({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
        requestId,
        status: 401,
      });
    }

    const { id } = await context.params;
    invariantString(id, "id");
    entryId = id.trim();

    if (!entryId) {
      return apiError({
        code: "INVALID_ENTRY_ID",
        message: "Entry id is required.",
        requestId,
        status: 400,
      });
    }

    await prisma.hiddenEntry.upsert({
      where: {
        userId_entryId: {
          entryId,
          userId,
        },
      },
      create: {
        entryId,
        userId,
      },
      update: {
        hiddenAt: new Date(),
      },
    });

    return apiSuccess({ data: { hidden: true }, requestId });
  } catch (error) {
    logApiError({
      error,
      metadata: {
        entryId,
        userId,
      },
      requestId,
      route: "POST /api/entries/[id]/hide",
    });

    return apiError({
      code: "HIDE_ENTRY_FAILED",
      message: "Unable to hide story.",
      requestId,
      status: 500,
    });
  }
}

export async function DELETE(_request: Request, context: HideRouteContext) {
  invariant(context.params instanceof Promise, "context params must be a Promise.");

  const requestId = createRequestId();
  let userId: string | null = null;
  let entryId: string | null = null;

  try {
    userId = await getCurrentUserId();

    if (!userId) {
      return apiError({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
        requestId,
        status: 401,
      });
    }

    const { id } = await context.params;
    invariantString(id, "id");
    entryId = id.trim();

    if (!entryId) {
      return apiError({
        code: "INVALID_ENTRY_ID",
        message: "Entry id is required.",
        requestId,
        status: 400,
      });
    }

    await prisma.hiddenEntry.deleteMany({
      where: {
        entryId,
        userId,
      },
    });

    return apiSuccess({ data: { hidden: false }, requestId });
  } catch (error) {
    logApiError({
      error,
      metadata: {
        entryId,
        userId,
      },
      requestId,
      route: "DELETE /api/entries/[id]/hide",
    });

    return apiError({
      code: "UNHIDE_ENTRY_FAILED",
      message: "Unable to restore story.",
      requestId,
      status: 500,
    });
  }
}
