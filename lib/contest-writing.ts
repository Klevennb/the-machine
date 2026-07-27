import { Prisma, type PrismaClient } from "@prisma/client";
import {
  getContestDraftDefaults,
  getContestSubmissionRequirements,
  normalizeStoryGenre,
  type StoryGenre,
} from "@/lib/entry-policy";
import { assertContestSubmission } from "@/lib/contest-rules";
import { creditEntryWritingProgress } from "@/lib/writing-progress";

export type ContestDraftInput = {
  entryId: string;
  title: string;
  plainText: string;
  content: Prisma.InputJsonValue | null;
  wordCount: number;
  privateAuthorNote: string;
  publicAuthorNote: string;
  storyGenre: StoryGenre | null;
  customStoryGenre: string | null;
  isNsfw: boolean;
};

function isJsonCompatible(value: unknown): value is Prisma.InputJsonValue {
  if (value === null) return true;
  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return typeof value !== "number" || Number.isFinite(value);
  }
  if (Array.isArray(value)) return value.every(isJsonCompatible);
  if (typeof value === "object") {
    return Object.values(value).every(
      (nested) => nested !== undefined && isJsonCompatible(nested)
    );
  }
  return false;
}

export function parseContestDraftInput(body: unknown):
  | { input: ContestDraftInput }
  | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be an object." };
  }

  const value = body as Record<string, unknown>;
  const requiredStrings = [
    "entryId",
    "title",
    "plainText",
    "privateAuthorNote",
    "publicAuthorNote",
  ] as const;
  for (const field of requiredStrings) {
    if (typeof value[field] !== "string") {
      return { error: `${field} must be a string.` };
    }
  }
  if (
    typeof value.wordCount !== "number" ||
    !Number.isFinite(value.wordCount) ||
    value.wordCount < 0
  ) {
    return { error: "Word count must be a non-negative number." };
  }
  if (typeof value.isNsfw !== "boolean") {
    return { error: "NSFW must be true or false." };
  }
  if (
    value.content !== null &&
    value.content !== undefined &&
    !isJsonCompatible(value.content)
  ) {
    return { error: "Editor content must be valid JSON." };
  }

  const normalizedGenre =
    value.storyGenre === null
      ? null
      : normalizeStoryGenre(value.storyGenre, value.customStoryGenre);
  if (value.storyGenre !== null && !normalizedGenre) {
    return { error: "Choose a valid story genre." };
  }

  return {
    input: {
      entryId: value.entryId as string,
      title: value.title as string,
      plainText: value.plainText as string,
      content:
        value.content === null || value.content === undefined
          ? null
          : value.content,
      wordCount: Math.round(value.wordCount as number),
      privateAuthorNote: value.privateAuthorNote as string,
      publicAuthorNote: value.publicAuthorNote as string,
      storyGenre: normalizedGenre?.storyGenre ?? null,
      customStoryGenre: normalizedGenre?.customStoryGenre ?? null,
      isNsfw: value.isNsfw as boolean,
    },
  };
}

function getSummary(plainText: string) {
  const normalized = plainText.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, 180) : null;
}

function getEntryData(input: ContestDraftInput, requireGenre: boolean) {
  const normalizedGenre =
    input.storyGenre === null
      ? null
      : normalizeStoryGenre(input.storyGenre, input.customStoryGenre);

  if (requireGenre && !normalizedGenre) {
    throw new Error("Choose a story genre before submitting.");
  }

  return {
    title: input.title.trim() || null,
    plainText: input.plainText,
    content: input.content === null ? Prisma.DbNull : input.content,
    wordCount: input.wordCount,
    summary: getSummary(input.plainText),
    privateAuthorNote: input.privateAuthorNote.trim() || null,
    publicAuthorNote: input.publicAuthorNote.trim() || null,
    storyGenre: normalizedGenre?.storyGenre ?? null,
    customStoryGenre: normalizedGenre?.customStoryGenre ?? null,
    isNsfw: input.isNsfw,
    isStandalone: true,
  };
}

export async function getOrCreateContestDraft(
  db: PrismaClient,
  {
    contestId,
    userId,
    now = new Date(),
  }: { contestId: string; userId: string; now?: Date }
) {
  const [existingDraft, submittedEntry] = await Promise.all([
    db.contestDraft.findUnique({
      where: { contestId_authorId: { contestId, authorId: userId } },
      include: { entry: true, contest: true },
    }),
    db.contestEntry.findUnique({
      where: { contestId_authorId: { contestId, authorId: userId } },
      select: { entryId: true, status: true },
    }),
  ]);

  if (submittedEntry?.status === "ACTIVE") {
    return { kind: "submitted" as const, entryId: submittedEntry.entryId };
  }
  if (submittedEntry?.status === "DISQUALIFIED") {
    throw new Error("A disqualified contest entry cannot be resubmitted.");
  }

  if (existingDraft) {
    return { kind: "draft" as const, draft: existingDraft };
  }

  const [contest, author] = await Promise.all([
    db.dailyContest.findUnique({ where: { id: contestId } }),
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, username: true },
    }),
  ]);

  if (!contest || !author) {
    throw new Error("Contest or writer not found.");
  }

  if (now < contest.submissionsOpenAt || now >= contest.submissionsCloseAt) {
    throw new Error("This contest is no longer accepting new drafts.");
  }

  const defaults = getContestDraftDefaults({
    authorDisplayName:
      author.name?.trim() || author.username?.trim() || "Writer",
    promptGenre: contest.promptGenre,
    promptTitle: contest.promptTitle,
  });

  try {
    const draft = await db.$transaction(async (tx) => {
      const entry = await tx.entry.create({
        data: {
          authorId: userId,
          title: defaults.title,
          storyGenre: defaults.storyGenre,
          customStoryGenre: defaults.customStoryGenre,
          sourceContestId: contest.id,
          sourcePromptTitle: contest.promptTitle,
          sourcePromptBody: contest.promptBody,
          sourcePromptGenre: contest.promptGenre,
          visibility: "PRIVATE",
          status: "DRAFT",
        },
      });

      return tx.contestDraft.create({
        data: { contestId, entryId: entry.id, authorId: userId },
        include: { entry: true, contest: true },
      });
    });

    return { kind: "draft" as const, draft };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const draft = await db.contestDraft.findUnique({
        where: { contestId_authorId: { contestId, authorId: userId } },
        include: { entry: true, contest: true },
      });
      if (draft) return { kind: "draft" as const, draft };
    }
    throw error;
  }
}

export async function convertContestDraft(
  db: PrismaClient,
  {
    input,
    userId,
  }: {
    input: ContestDraftInput;
    userId: string;
  }
) {
  return db.$transaction(async (tx) => {
    const draft = await tx.contestDraft.findFirst({
      where: { entryId: input.entryId, authorId: userId },
      include: { entry: { select: { wordCount: true } } },
    });
    if (!draft) throw new Error("Contest draft not found.");

    const entry = await tx.entry.update({
      where: { id: draft.entryId },
      data: {
        ...getEntryData(input, false),
        visibility: "PRIVATE",
        status: "DRAFT",
      },
    });
    await tx.contestDraft.delete({ where: { id: draft.id } });
    const progress = await creditEntryWritingProgress({
      db: tx,
      entryId: entry.id,
      userId,
      wordDelta: input.wordCount - draft.entry.wordCount,
    });

    return { entry, progress };
  });
}

export async function submitContestDraft(
  db: PrismaClient,
  {
    input,
    userId,
    now = new Date(),
  }: {
    input: ContestDraftInput;
    userId: string;
    now?: Date;
  }
) {
  return db.$transaction(async (tx) => {
    const draft = await tx.contestDraft.findFirst({
      where: { entryId: input.entryId, authorId: userId },
      include: {
        contest: true,
        entry: { select: { firstSubmittedAt: true, wordCount: true } },
      },
    });
    if (!draft) throw new Error("Contest draft not found.");

    const requirements = getContestSubmissionRequirements({
      title: input.title,
      storyGenre: input.storyGenre,
      wordCount: input.wordCount,
    });
    if (!requirements.hasTitle) {
      throw new Error("Add a title before submitting.");
    }
    if (!requirements.hasStoryGenre) {
      throw new Error("Choose a story genre before submitting.");
    }
    assertContestSubmission({
      now,
      wordCount: input.wordCount,
      window: draft.contest,
    });

    const entry = await tx.entry.update({
      where: { id: draft.entryId },
      data: {
        ...getEntryData(input, true),
        visibility: "PUBLIC",
        status: "PUBLISHED",
        firstSubmittedAt: draft.entry.firstSubmittedAt ?? now,
        publishedAt: now,
      },
    });

    const previous = await tx.contestEntry.findUnique({
      where: {
        contestId_authorId: {
          contestId: draft.contestId,
          authorId: userId,
        },
      },
    });
    const contestEntry = previous
      ? await tx.contestEntry.update({
          where: { id: previous.id },
          data: {
            entryId: entry.id,
            status: "ACTIVE",
            submittedAt: now,
            withdrawnAt: null,
            voteCount: 0,
          },
        })
      : await tx.contestEntry.create({
          data: {
            contestId: draft.contestId,
            entryId: entry.id,
            authorId: userId,
            submittedAt: now,
          },
        });

    if (previous) {
      await tx.contestVote.deleteMany({ where: { contestEntryId: previous.id } });
    }
    await tx.contestDraft.delete({ where: { id: draft.id } });
    const progress = await creditEntryWritingProgress({
      db: tx,
      entryId: entry.id,
      userId,
      wordDelta: input.wordCount - draft.entry.wordCount,
    });

    return {
      contestDate: draft.contest.contestDate.toISOString().slice(0, 10),
      contestEntry,
      entry,
      progress,
    };
  });
}

export async function withdrawContestSubmission(
  db: PrismaClient,
  {
    contestEntryId,
    userId,
    now = new Date(),
  }: { contestEntryId: string; userId: string; now?: Date }
) {
  return db.$transaction(async (tx) => {
    const item = await tx.contestEntry.findFirst({
      where: {
        id: contestEntryId,
        authorId: userId,
        status: "ACTIVE",
        contest: { submissionsCloseAt: { gt: now } },
      },
    });
    if (!item) throw new Error("This contest entry can no longer be withdrawn.");

    await tx.contestVote.deleteMany({ where: { contestEntryId } });
    await tx.contestEntry.update({
      where: { id: contestEntryId },
      data: {
        status: "WITHDRAWN",
        withdrawnAt: now,
        voteCount: 0,
      },
    });
    await tx.entry.update({
      where: { id: item.entryId },
      data: { visibility: "PRIVATE", status: "DRAFT", publishedAt: null },
    });
    return tx.contestDraft.create({
      data: {
        contestId: item.contestId,
        entryId: item.entryId,
        authorId: userId,
      },
    });
  });
}
