import { Prisma } from "@prisma/client";
import { apiError, apiSuccess, createRequestId, logApiError } from "@/lib/api-response";
import { invariant, invariantString } from "@/lib/invariant";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { isStoryVisibility, type StoryVisibility } from "@/lib/stories";
import { creditEntryWritingProgress } from "@/lib/writing-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SaveDraftPayload = {
  entryId: string | null;
  title: string;
  plainText: string;
  content: Prisma.InputJsonValue | null;
  wordCount: number;
  privateAuthorNote: string;
  publicAuthorNote: string;
  promptId: string | null;
  visibility: StoryVisibility;
  isNsfw: boolean;
};

function getSummary(plainText: string) {
  invariantString(plainText, "plainText");

  const normalized = plainText.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 180);
}

function getFallbackTitle(title: string, plainText: string) {
  invariantString(title, "title");
  invariantString(plainText, "plainText");

  const normalizedTitle = title.trim();
  if (normalizedTitle) {
    return normalizedTitle;
  }

  const firstLine = plainText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "Untitled Entry";
  }

  return firstLine.slice(0, 80);
}

function isJsonCompatible(value: unknown): value is Prisma.InputJsonValue {
  invariant(value !== undefined, "value must be defined.");

  if (value === null) {
    return true;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return Number.isFinite(value) || typeof value !== "number";
  }

  if (Array.isArray(value)) {
    return value.every(isJsonCompatible);
  }

  if (typeof value === "object") {
    return Object.values(value).every(
      (nestedValue) => nestedValue !== undefined && isJsonCompatible(nestedValue)
    );
  }

  return false;
}

function optionalString(value: unknown, fieldName: string) {
  invariantString(fieldName, "fieldName");

  if (value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    return null;
  }

  return value;
}

function optionalNullableId(value: unknown, fieldName: string) {
  invariantString(fieldName, "fieldName");

  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseSaveDraftPayload(body: unknown) {
  invariant(body !== undefined, "body must be defined.");

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be an object." } as const;
  }

  const record = body as Record<string, unknown>;
  const entryId = optionalNullableId(record.entryId, "entryId");
  const promptId = optionalNullableId(record.promptId, "promptId");
  const title = optionalString(record.title, "title");
  const plainText = optionalString(record.plainText, "plainText");
  const privateAuthorNote = optionalString(
    record.privateAuthorNote,
    "privateAuthorNote"
  );
  const publicAuthorNote = optionalString(
    record.publicAuthorNote,
    "publicAuthorNote"
  );
  const visibility =
    record.visibility === undefined ? "PRIVATE" : record.visibility;
  const isNsfw = record.isNsfw === undefined ? false : record.isNsfw;

  if (entryId === undefined) {
    return { error: "Entry id must be a string when provided." } as const;
  }

  if (promptId === undefined) {
    return { error: "Prompt id must be a string when provided." } as const;
  }

  if (title === null) {
    return { error: "Title must be a string." } as const;
  }

  if (plainText === null) {
    return { error: "Story text must be a string." } as const;
  }

  if (privateAuthorNote === null || publicAuthorNote === null) {
    return { error: "Author notes must be strings." } as const;
  }

  if (!isStoryVisibility(visibility)) {
    return { error: "Choose private, friends, or public visibility." } as const;
  }

  if (typeof isNsfw !== "boolean") {
    return { error: "NSFW must be true or false." } as const;
  }

  if (
    record.wordCount !== undefined &&
    (!Number.isFinite(record.wordCount) || Number(record.wordCount) < 0)
  ) {
    return { error: "Word count must be a non-negative number." } as const;
  }

  if (
    record.content !== undefined &&
    record.content !== null &&
    !isJsonCompatible(record.content)
  ) {
    return { error: "Editor content must be valid JSON." } as const;
  }

  return {
    payload: {
      entryId,
      title,
      plainText,
      content:
        record.content === undefined || record.content === null
          ? null
          : record.content,
      wordCount:
        record.wordCount === undefined ? 0 : Math.round(Number(record.wordCount)),
      privateAuthorNote,
      publicAuthorNote,
      promptId,
      visibility,
      isNsfw,
    } satisfies SaveDraftPayload,
  } as const;
}

async function readJson(request: Request) {
  invariant(request instanceof Request, "request must be a Request.");

  try {
    return { body: await request.json() } as const;
  } catch {
    return { error: "Request body must be valid JSON." } as const;
  }
}

async function assertAuthorEntryExists(entryId: string, userId: string) {
  invariantString(entryId, "entryId");
  invariantString(userId, "userId");

  return prisma.entry.findFirst({
    where: {
      id: entryId,
      authorId: userId,
    },
    select: {
      id: true,
    },
  });
}

export async function GET() {
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

  const draft = await prisma.entry.findFirst({
    where: {
      authorId: userId,
      status: "DRAFT",
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      title: true,
      plainText: true,
      content: true,
      wordCount: true,
      privateAuthorNote: true,
      publicAuthorNote: true,
      visibility: true,
      isNsfw: true,
      updatedAt: true,
    },
  });

  return apiSuccess({ data: { draft }, requestId });
}

export async function POST(request: Request) {
  invariant(request instanceof Request, "request must be a Request.");

  const requestId = createRequestId();
  let userId: string | null = null;
  let requestedEntryId: string | null = null;

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
    const authenticatedUserId = userId;

    const json = await readJson(request);

    if ("error" in json) {
      return apiError({
        code: "INVALID_JSON",
        message: json.error ?? "Request body must be valid JSON.",
        requestId,
        status: 400,
      });
    }

    const parsed = parseSaveDraftPayload(json.body);

    if ("error" in parsed) {
      return apiError({
        code: "INVALID_ENTRY_PAYLOAD",
        message: parsed.error ?? "Request body is invalid.",
        requestId,
        status: 400,
      });
    }

    const {
      content,
      entryId,
      plainText,
      privateAuthorNote,
      promptId,
      publicAuthorNote,
      title,
      visibility,
      isNsfw,
      wordCount,
    } = parsed.payload;
    requestedEntryId = entryId;

    const draftData = {
      title: getFallbackTitle(title, plainText),
      plainText,
      content: content === null ? Prisma.DbNull : content,
      wordCount,
      summary: getSummary(plainText),
      privateAuthorNote: privateAuthorNote.trim() || null,
      publicAuthorNote: publicAuthorNote.trim() || null,
      promptId,
      visibility,
      isNsfw,
      isStandalone: true,
    };

    if (entryId) {
      const existingDraft = await prisma.entry.findFirst({
        where: {
          id: entryId,
          authorId: authenticatedUserId,
        },
        select: {
          id: true,
          wordCount: true,
          contestEntry: { select: { status: true } },
        },
      });

      if (!existingDraft) {
        return apiError({
          code: "ENTRY_NOT_FOUND",
          message: "Entry not found",
          requestId,
          status: 404,
        });
      }

      if (existingDraft.contestEntry?.status === "ACTIVE") {
        return apiError({
          code: "CONTEST_ENTRY_LOCKED",
          message: "Contest entries cannot be edited after submission.",
          requestId,
          status: 409,
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const draft = await tx.entry.update({
          where: {
            id: existingDraft.id,
          },
          data: draftData,
          select: {
            id: true,
            updatedAt: true,
          },
        });
        const progress = await creditEntryWritingProgress({
          db: tx,
          entryId: draft.id,
          userId: authenticatedUserId,
          wordDelta: wordCount - existingDraft.wordCount,
        });

        return { draft, progress };
      });

      const confirmedEntry = await assertAuthorEntryExists(
        result.draft.id,
        authenticatedUserId
      );

      if (!confirmedEntry) {
        return apiError({
          code: "ENTRY_CONFIRMATION_FAILED",
          message: "Entry was updated but could not be confirmed.",
          requestId,
          status: 500,
        });
      }

      return apiSuccess({ data: result, requestId });
    }

    const result = await prisma.$transaction(async (tx) => {
      const draft = await tx.entry.create({
        data: {
          authorId: authenticatedUserId,
          ...draftData,
          status: "DRAFT" as const,
        },
        select: {
          id: true,
          updatedAt: true,
        },
      });
      const progress = await creditEntryWritingProgress({
        db: tx,
        entryId: draft.id,
        userId: authenticatedUserId,
        wordDelta: wordCount,
      });

      return { draft, progress };
    });

    const confirmedEntry = await assertAuthorEntryExists(
      result.draft.id,
      authenticatedUserId
    );

    if (!confirmedEntry) {
      return apiError({
        code: "ENTRY_CONFIRMATION_FAILED",
        message: "Entry was created but could not be confirmed.",
        requestId,
        status: 500,
      });
    }

    return apiSuccess({ data: result, requestId, status: 201 });
  } catch (error) {
    logApiError({
      error,
      metadata: {
        entryId: requestedEntryId,
        userId,
      },
      requestId,
      route: "POST /api/entries/draft",
    });

    return apiError({
      code: "ENTRY_PUBLISH_FAILED",
      message: "Unable to publish entry.",
      requestId,
      status: 500,
    });
  }
}
