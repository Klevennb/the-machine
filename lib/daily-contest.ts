import { Prisma, type PrismaClient } from "@prisma/client";
import { assertContestVote, CONTEST_TIME_ZONE, getContestWindow, selectContestPrompt, selectWinner } from "@/lib/contest-rules";

type Db = PrismaClient | Prisma.TransactionClient;

export function getChicagoContestDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CONTEST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function contestDateToDbDate(contestDate: string) {
  return new Date(`${contestDate}T00:00:00.000Z`);
}

export async function getOrCreateContest(db: PrismaClient, now = new Date()) {
  const contestDate = getChicagoContestDate(now);
  const date = contestDateToDbDate(contestDate);
  const existing = await db.dailyContest.findUnique({ where: { contestDate: date } });
  if (existing) return existing;

  const [queueItems, used, builtInPrompts, communityPrompts] = await Promise.all([
    db.contestPromptQueueItem.findMany({
      where: { status: "QUEUED", OR: [{ scheduledDate: date }, { scheduledDate: null }] },
      orderBy: { position: "asc" },
      include: { builtInPrompt: true, writingPrompt: true },
    }),
    db.dailyContest.findMany({ select: { promptSource: true, sourcePromptId: true } }),
    db.prompt.findMany(),
    db.writingPrompt.findMany({ where: { status: "APPROVED" } }),
  ]);
  const usedKeys = new Set(used.map((item) => `${item.promptSource}:${item.sourcePromptId}`));
  const fallback = [
    ...builtInPrompts.filter((item) => !usedKeys.has(`BUILT_IN:${item.id}`)).map((item) => ({ ...item, source: "BUILT_IN" as const })),
    ...communityPrompts.filter((item) => !usedKeys.has(`COMMUNITY:${item.id}`)).map((item) => ({ ...item, tags: [] as string[], source: "COMMUNITY" as const })),
  ];
  const selected = selectContestPrompt({
    contestDate,
    queueItems: queueItems.map((item) => ({ id: item.id, scheduledDate: item.scheduledDate?.toISOString().slice(0, 10) ?? null, position: item.position })),
    unusedPrompts: fallback,
    random: Math.random,
  });
  if (!selected) return null;

  const queueItem = selected.kind === "queue" ? queueItems.find((item) => item.id === selected.id) : null;
  const prompt = queueItem?.builtInPrompt ?? queueItem?.writingPrompt ?? fallback.find((item) => item.id === selected.id);
  if (!prompt) return null;
  const source = queueItem?.writingPromptId || ("source" in prompt && prompt.source === "COMMUNITY") ? "COMMUNITY" : "BUILT_IN";
  const window = getContestWindow(contestDate);

  try {
    return await db.$transaction(async (tx) => {
      const contest = await tx.dailyContest.create({
        data: {
          contestDate: date,
          promptTitle: prompt.title,
          promptBody: prompt.body,
          promptGenre: prompt.genre,
          promptSource: source,
          sourcePromptId: prompt.id,
          ...window,
        },
      });
      if (queueItem) {
        await tx.contestPromptQueueItem.update({ where: { id: queueItem.id }, data: { status: "USED", usedAt: now } });
      }
      return contest;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return db.dailyContest.findUnique({ where: { contestDate: date } });
    }
    throw error;
  }
}

export async function moveContestVote(db: PrismaClient, { contestEntryId, userId, now = new Date() }: { contestEntryId: string; userId: string; now?: Date }) {
  return db.$transaction(async (tx) => {
    const [target, user] = await Promise.all([
      tx.contestEntry.findUnique({ where: { id: contestEntryId }, include: { contest: true, entry: { select: { isNsfw: true } } } }),
      tx.user.findUnique({ where: { id: userId }, select: { showNsfwContestEntries: true } }),
    ]);
    if (!target || !user) throw new Error("Contest entry not found.");
    assertContestVote({ authorId: target.authorId, entryStatus: target.status, isNsfw: target.entry.isNsfw, now, showNsfwContestEntries: user.showNsfwContestEntries, userId, votingCloseAt: target.contest.votingCloseAt });
    const previous = await tx.contestVote.findUnique({ where: { contestId_userId: { contestId: target.contestId, userId } } });
    if (previous?.contestEntryId === target.id) return previous;
    if (previous) await tx.contestEntry.update({ where: { id: previous.contestEntryId }, data: { voteCount: { decrement: 1 } } });
    const vote = await tx.contestVote.upsert({
      where: { contestId_userId: { contestId: target.contestId, userId } },
      create: { contestId: target.contestId, contestEntryId: target.id, userId },
      update: { contestEntryId: target.id },
    });
    await tx.contestEntry.update({ where: { id: target.id }, data: { voteCount: { increment: 1 } } });
    return vote;
  });
}

export async function finalizeContest(db: Db, contestId: string, now = new Date()) {
  const contest = await db.dailyContest.findUnique({ where: { id: contestId }, include: { entries: { where: { status: "ACTIVE" } } } });
  if (!contest || contest.finalizedAt || now < contest.votingCloseAt) return contest;
  const winner = selectWinner(contest.entries);
  return db.dailyContest.update({ where: { id: contest.id }, data: { winnerEntryId: winner?.id ?? null, finalizedAt: now }, include: { entries: true } });
}
