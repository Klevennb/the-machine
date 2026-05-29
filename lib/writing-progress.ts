import type { Prisma, PrismaClient } from "@prisma/client";
import { invariant, invariantString } from "@/lib/invariant";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

const FALLBACK_TIMEZONE = "America/Chicago";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type WritingProgressSnapshot = {
  date: string;
  wordsWritten: number;
  targetWords: number;
  goalMet: boolean;
  creditedDelta: number;
  currentStreakDays: number;
  bestStreakDays: number;
};

function getDatePartsInTimezone(date: Date, timezone: string) {
  invariant(date instanceof Date, "date must be a Date.");
  invariantString(timezone, "timezone");

  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function normalizeTimezone(timezone: string | null | undefined) {
  invariant(
    timezone === null || timezone === undefined || typeof timezone === "string",
    "timezone must be a string when provided."
  );

  const candidate = timezone?.trim() || FALLBACK_TIMEZONE;

  try {
    getDatePartsInTimezone(new Date(), candidate);
    return candidate;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

function getProgressDateForTimezone(timezone: string, now = new Date()) {
  invariantString(timezone, "timezone");
  invariant(now instanceof Date, "now must be a Date.");

  const parts = getDatePartsInTimezone(now, normalizeTimezone(timezone));

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function formatProgressDate(date: Date) {
  invariant(date instanceof Date, "date must be a Date.");

  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  invariant(date instanceof Date, "date must be a Date.");
  invariant(Number.isFinite(days), "days must be finite.");

  return new Date(date.getTime() + days * MS_PER_DAY);
}

async function ensureActiveWordGoal(
  db: PrismaExecutor,
  userId: string,
  options?: {
    dailyTargetWords?: number;
    streakGoalDays?: number;
  }
) {
  invariant(Boolean(db), "db is required.");
  invariantString(userId, "userId");
  invariant(options === undefined || typeof options === "object", "options must be an object when provided.");

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      dailyTargetWords: true,
      streakGoalDays: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const dailyTargetWords = options?.dailyTargetWords ?? user.dailyTargetWords;
  const streakGoalDays = options?.streakGoalDays ?? user.streakGoalDays;
  const activeGoals = await db.wordGoal.findMany({
    where: {
      userId,
      isActive: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      title: true,
      bestStreakDays: true,
      currentStreakDays: true,
    },
  });

  if (activeGoals.length === 0) {
    return db.wordGoal.create({
      data: {
        userId,
        title: "Daily writing streak",
        description: "Private words saved toward your daily writing habit.",
        dailyTargetWords,
        streakGoalDays,
        startDate: new Date(),
      },
      select: {
        id: true,
        dailyTargetWords: true,
        streakGoalDays: true,
        currentStreakDays: true,
        bestStreakDays: true,
      },
    });
  }

  const [primaryGoal] = activeGoals;

  if (activeGoals.length > 1) {
    await db.wordGoal.updateMany({
      where: {
        userId,
        isActive: true,
        id: {
          not: primaryGoal.id,
        },
      },
      data: {
        isActive: false,
        endDate: new Date(),
      },
    });
  }

  return db.wordGoal.update({
    where: {
      id: primaryGoal.id,
    },
    data: {
      dailyTargetWords,
      streakGoalDays,
    },
    select: {
      id: true,
      dailyTargetWords: true,
      streakGoalDays: true,
      currentStreakDays: true,
      bestStreakDays: true,
    },
  });
}

async function recalculateStreak(
  db: PrismaExecutor,
  goalId: string,
  today: Date,
  previousBestStreakDays: number
) {
  invariant(Boolean(db), "db is required.");
  invariantString(goalId, "goalId");
  invariant(today instanceof Date, "today must be a Date.");
  invariant(Number.isFinite(previousBestStreakDays), "previousBestStreakDays must be finite.");

  const progressDays = await db.dailyProgress.findMany({
    where: {
      goalId,
      goalMet: true,
      date: {
        lte: today,
      },
    },
    orderBy: {
      date: "desc",
    },
    select: {
      date: true,
    },
  });
  const metDates = new Set(
    progressDays.map((progressDay) => formatProgressDate(progressDay.date))
  );
  let cursor = today;
  let currentStreakDays = 0;

  if (!metDates.has(formatProgressDate(cursor))) {
    cursor = addDays(cursor, -1);
  }

  while (metDates.has(formatProgressDate(cursor))) {
    currentStreakDays += 1;
    cursor = addDays(cursor, -1);
  }

  const bestStreakDays = Math.max(previousBestStreakDays, currentStreakDays);

  await db.wordGoal.update({
    where: {
      id: goalId,
    },
    data: {
      currentStreakDays,
      bestStreakDays,
    },
  });

  return {
    currentStreakDays,
    bestStreakDays,
  };
}

export async function syncActiveWordGoal(
  db: PrismaExecutor,
  userId: string,
  options?: {
    dailyTargetWords?: number;
    streakGoalDays?: number;
  }
) {
  invariant(Boolean(db), "db is required.");
  invariantString(userId, "userId");
  invariant(options === undefined || typeof options === "object", "options must be an object when provided.");

  return ensureActiveWordGoal(db, userId, options);
}

export async function getTodayWritingProgress(
  db: PrismaExecutor,
  userId: string,
  now = new Date()
): Promise<WritingProgressSnapshot> {
  invariant(Boolean(db), "db is required.");
  invariantString(userId, "userId");
  invariant(now instanceof Date, "now must be a Date.");

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      dailyTargetWords: true,
      timezone: true,
      wordGoals: {
        where: {
          isActive: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          dailyTargetWords: true,
          currentStreakDays: true,
          bestStreakDays: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const today = getProgressDateForTimezone(user.timezone, now);
  const activeGoal = user.wordGoals[0] ?? null;
  const progress = activeGoal
    ? await db.dailyProgress.findUnique({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
        select: {
          wordsWritten: true,
          targetWords: true,
          goalMet: true,
        },
      })
    : null;

  return {
    date: formatProgressDate(today),
    wordsWritten: progress?.wordsWritten ?? 0,
    targetWords:
      progress?.targetWords ??
      activeGoal?.dailyTargetWords ??
      user.dailyTargetWords,
    goalMet: progress?.goalMet ?? false,
    creditedDelta: 0,
    currentStreakDays: activeGoal?.currentStreakDays ?? 0,
    bestStreakDays: activeGoal?.bestStreakDays ?? 0,
  };
}

export async function creditEntryWritingProgress({
  db,
  entryId,
  userId,
  wordDelta,
  now = new Date(),
}: {
  db: PrismaExecutor;
  entryId: string;
  userId: string;
  wordDelta: number;
  now?: Date;
}): Promise<WritingProgressSnapshot> {
  invariant(Boolean(db), "db is required.");
  invariantString(entryId, "entryId");
  invariantString(userId, "userId");
  invariant(Number.isFinite(wordDelta), "wordDelta must be finite.");
  invariant(now instanceof Date, "now must be a Date.");

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      timezone: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const today = getProgressDateForTimezone(user.timezone, now);
  const goal = await ensureActiveWordGoal(db, userId);
  const existingProgress = await db.dailyProgress.findUnique({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
    select: {
      id: true,
      goalId: true,
      wordsWritten: true,
      targetWords: true,
    },
  });

  const dailyProgress =
    existingProgress ??
    (await db.dailyProgress.create({
      data: {
        userId,
        goalId: goal.id,
        date: today,
        targetWords: goal.dailyTargetWords,
      },
      select: {
        id: true,
        goalId: true,
        wordsWritten: true,
        targetWords: true,
      },
    }));

  const existingCredit = await db.entryProgressCredit.findUnique({
    where: {
      entryId_dailyProgressId: {
        entryId,
        dailyProgressId: dailyProgress.id,
      },
    },
    select: {
      id: true,
      creditedWords: true,
    },
  });
  const roundedDelta = Math.round(wordDelta);
  const nextCreditedWords = Math.max(
    0,
    (existingCredit?.creditedWords ?? 0) + roundedDelta
  );
  const creditedDelta = nextCreditedWords - (existingCredit?.creditedWords ?? 0);
  const wordsWritten = Math.max(
    0,
    dailyProgress.wordsWritten + creditedDelta
  );
  const targetWords = dailyProgress.targetWords;
  const goalMet = wordsWritten >= targetWords;

  if (existingCredit) {
    await db.entryProgressCredit.update({
      where: {
        id: existingCredit.id,
      },
      data: {
        creditedWords: nextCreditedWords,
        creditedDate: today,
      },
    });
  } else {
    await db.entryProgressCredit.create({
      data: {
        entryId,
        dailyProgressId: dailyProgress.id,
        creditedDate: today,
        creditedWords: nextCreditedWords,
      },
    });
  }

  const updatedProgress = await db.dailyProgress.update({
    where: {
      id: dailyProgress.id,
    },
    data: {
      goalId: goal.id,
      wordsWritten,
      goalMet,
      streakDayNumber: goalMet ? undefined : null,
    },
    select: {
      wordsWritten: true,
      targetWords: true,
      goalMet: true,
    },
  });
  const streak = await recalculateStreak(
    db,
    goal.id,
    today,
    goal.bestStreakDays
  );

  if (updatedProgress.goalMet) {
    await db.dailyProgress.update({
      where: {
        id: dailyProgress.id,
      },
      data: {
        streakDayNumber: streak.currentStreakDays,
      },
    });
  }

  return {
    date: formatProgressDate(today),
    wordsWritten: updatedProgress.wordsWritten,
    targetWords: updatedProgress.targetWords,
    goalMet: updatedProgress.goalMet,
    creditedDelta,
    currentStreakDays: streak.currentStreakDays,
    bestStreakDays: streak.bestStreakDays,
  };
}
