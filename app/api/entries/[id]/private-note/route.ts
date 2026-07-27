import { apiError, apiSuccess, createRequestId } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
      requestId,
      status: 401,
    });
  }

  const { id } = await params;
  const body = (await request.json()) as { privateAuthorNote?: unknown };
  if (typeof body.privateAuthorNote !== "string") {
    return apiError({
      code: "INVALID_PRIVATE_NOTE",
      message: "Private note must be a string.",
      requestId,
      status: 400,
    });
  }

  const entry = await prisma.entry.findFirst({
    where: {
      id,
      authorId: userId,
      contestEntry: { status: "ACTIVE" },
    },
    select: { id: true },
  });
  if (!entry) {
    return apiError({
      code: "ENTRY_NOT_FOUND",
      message: "Locked contest entry not found.",
      requestId,
      status: 404,
    });
  }

  const updated = await prisma.entry.update({
    where: { id },
    data: {
      privateAuthorNote: body.privateAuthorNote.trim() || null,
    },
    select: { id: true, privateAuthorNote: true, updatedAt: true },
  });
  return apiSuccess({ data: { entry: updated }, requestId });
}
