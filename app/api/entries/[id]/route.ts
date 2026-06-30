import { apiError, apiSuccess, createRequestId, logApiError } from "@/lib/api-response";
import { invariant, invariantString } from "@/lib/invariant";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { isStoryVisibility, type StoryVisibility } from "@/lib/stories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EntryVisibilityPayload = {
  visibility?: StoryVisibility;
  isNsfw?: boolean;
};

type EntryRouteContext = {
  params: Promise<{ id: string }>;
};

async function readJson(request: Request) {
  invariant(request instanceof Request, "request must be a Request.");

  try {
    return { body: await request.json() } as const;
  } catch {
    return { error: "Request body must be valid JSON." } as const;
  }
}

function parseVisibilityPayload(body: unknown) {
  invariant(body !== undefined, "body must be defined.");

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be an object." } as const;
  }

  const visibility = (body as EntryVisibilityPayload).visibility;

  if (!isStoryVisibility(visibility)) {
    return { error: "Choose private, friends, or public visibility." } as const;
  }

  const isNsfw = (body as EntryVisibilityPayload).isNsfw;

  if (isNsfw !== undefined && typeof isNsfw !== "boolean") {
    return { error: "NSFW must be true or false." } as const;
  }

  return { isNsfw, visibility } as const;
}

export async function PATCH(request: Request, context: EntryRouteContext) {
  invariant(request instanceof Request, "request must be a Request.");
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

    const json = await readJson(request);

    if ("error" in json) {
      return apiError({
        code: "INVALID_JSON",
        message: json.error ?? "Request body must be valid JSON.",
        requestId,
        status: 400,
      });
    }

    const parsed = parseVisibilityPayload(json.body);

    if ("error" in parsed) {
      return apiError({
        code: "INVALID_VISIBILITY",
        message: parsed.error ?? "Choose private, friends, or public visibility.",
        requestId,
        status: 400,
      });
    }

    const existingEntry = await prisma.entry.findFirst({
      where: {
        id: entryId,
        authorId: userId,
      },
      select: {
        id: true,
        publishedAt: true,
      },
    });

    if (!existingEntry) {
      return apiError({
        code: "ENTRY_NOT_FOUND",
        message: "Entry not found",
        requestId,
        status: 404,
      });
    }

    const entry = await prisma.entry.update({
      where: {
        id: existingEntry.id,
      },
      data: {
        visibility: parsed.visibility,
        ...(parsed.isNsfw === undefined ? {} : { isNsfw: parsed.isNsfw }),
        status: "PUBLISHED",
        publishedAt: existingEntry.publishedAt ?? new Date(),
      },
      select: {
        id: true,
        visibility: true,
        isNsfw: true,
        status: true,
        updatedAt: true,
        publishedAt: true,
      },
    });

    return apiSuccess({ data: { entry }, requestId });
  } catch (error) {
    logApiError({
      error,
      metadata: {
        entryId,
        userId,
      },
      requestId,
      route: "PATCH /api/entries/[id]",
    });

    return apiError({
      code: "ENTRY_VISIBILITY_UPDATE_FAILED",
      message: "Unable to update entry visibility.",
      requestId,
      status: 500,
    });
  }
}
