import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { creditEntryWritingProgress } from "@/lib/writing-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SaveDraftPayload = {
  entryId?: string;
  title?: string;
  plainText?: string;
  content?: Prisma.InputJsonValue | null;
  wordCount?: number;
  privateAuthorNote?: string;
  publicAuthorNote?: string;
  promptId?: string | null;
};

function getSummary(plainText: string) {
  const normalized = plainText.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 180);
}

function getFallbackTitle(title: string, plainText: string) {
  const normalizedTitle = title.trim();
  if (normalizedTitle) {
    return normalizedTitle;
  }

  const firstLine = plainText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "Untitled Draft";
  }

  return firstLine.slice(0, 80);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
      updatedAt: true,
    },
  });

  return Response.json({ draft });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SaveDraftPayload;
  const plainText = typeof body.plainText === "string" ? body.plainText : "";
  const title = typeof body.title === "string" ? body.title : "";
  const privateAuthorNote =
    typeof body.privateAuthorNote === "string" ? body.privateAuthorNote : "";
  const publicAuthorNote =
    typeof body.publicAuthorNote === "string" ? body.publicAuthorNote : "";
  const promptId =
    typeof body.promptId === "string" && body.promptId.trim()
      ? body.promptId.trim()
      : null;
  const wordCount = Number.isFinite(body.wordCount) ? Math.max(0, body.wordCount ?? 0) : 0;
  const content =
    body.content === undefined || body.content === null
      ? Prisma.DbNull
      : body.content;

  const draftData = {
    title: getFallbackTitle(title, plainText),
    plainText,
    content,
    wordCount,
    summary: getSummary(plainText),
    privateAuthorNote: privateAuthorNote.trim() || null,
    publicAuthorNote: publicAuthorNote.trim() || null,
    promptId,
    isStandalone: true,
  };

  if (body.entryId) {
    const existingDraft = await prisma.entry.findFirst({
      where: {
        id: body.entryId,
        authorId: userId,
      },
      select: {
        id: true,
        wordCount: true,
      },
    });

    if (!existingDraft) {
      return Response.json({ error: "Draft not found" }, { status: 404 });
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
        userId,
        wordDelta: wordCount - existingDraft.wordCount,
      });

      return { draft, progress };
    });

    return Response.json(result);
  }

  const result = await prisma.$transaction(async (tx) => {
    const draft = await tx.entry.create({
      data: {
        authorId: userId,
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
      userId,
      wordDelta: wordCount,
    });

    return { draft, progress };
  });

  return Response.json(result, { status: 201 });
}
