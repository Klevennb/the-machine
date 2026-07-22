export const CONTEST_TIME_ZONE = "America/Chicago";

export type ContestWindow = {
  submissionsOpenAt: Date;
  submissionsCloseAt: Date;
  votingCloseAt: Date;
};

type QueueCandidate = { id: string; scheduledDate: string | null; position: number };
type PromptCandidate = { id: string };

export function selectContestPrompt({
  contestDate,
  queueItems,
  unusedPrompts,
  random,
}: {
  contestDate: string;
  queueItems: QueueCandidate[];
  unusedPrompts: PromptCandidate[];
  random: () => number;
}): { kind: "queue" | "fallback"; id: string } | null {
  const scheduled = queueItems
    .filter((item) => item.scheduledDate === contestDate)
    .sort((a, b) => a.position - b.position)[0];
  if (scheduled) return { kind: "queue", id: scheduled.id };

  const unscheduled = queueItems
    .filter((item) => item.scheduledDate === null)
    .sort((a, b) => a.position - b.position)[0];
  if (unscheduled) return { kind: "queue", id: unscheduled.id };
  if (unusedPrompts.length === 0) return null;

  const index = Math.min(unusedPrompts.length - 1, Math.floor(random() * unusedPrompts.length));
  return { kind: "fallback", id: unusedPrompts[index].id };
}

export function selectWinner<T extends { id: string; voteCount: number; submittedAt: Date }>(entries: T[]) {
  return [...entries].sort(
    (a, b) =>
      b.voteCount - a.voteCount ||
      a.submittedAt.getTime() - b.submittedAt.getTime() ||
      a.id.localeCompare(b.id)
  )[0] ?? null;
}

export function assertContestSubmission({ now, wordCount, window }: { now: Date; wordCount: number; window: ContestWindow }) {
  if (wordCount < 100) throw new Error("Contest entries must contain at least 100 words.");
  if (now < window.submissionsOpenAt || now >= window.submissionsCloseAt) {
    throw new Error("Contest submissions are closed.");
  }
}

export function assertContestVote({
  authorId,
  entryStatus,
  isNsfw,
  now,
  showNsfwContestEntries,
  userId,
  votingCloseAt,
}: {
  authorId: string;
  entryStatus: "ACTIVE" | "WITHDRAWN" | "DISQUALIFIED";
  isNsfw: boolean;
  now: Date;
  showNsfwContestEntries: boolean;
  userId: string;
  votingCloseAt: Date;
}) {
  if (now >= votingCloseAt) throw new Error("Contest voting is closed.");
  if (entryStatus !== "ACTIVE") throw new Error("This entry is not eligible for voting.");
  if (authorId === userId) throw new Error("You cannot vote for your own contest entry.");
  if (isNsfw && !showNsfwContestEntries) {
    throw new Error("Enable the contest NSFW setting before voting for this entry.");
  }
}

function addDays(contestDate: string, days: number) {
  const [year, month, day] = contestDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
}

function chicagoMidnight(year: number, month: number, day: number) {
  const noon = new Date(Date.UTC(year, month - 1, day, 12));
  const zoneName = new Intl.DateTimeFormat("en-US", {
    timeZone: CONTEST_TIME_ZONE,
    timeZoneName: "longOffset",
  }).formatToParts(noon).find((part) => part.type === "timeZoneName")?.value;
  const match = zoneName?.match(/GMT([+-])(\d{2}):(\d{2})/);

  if (!match) {
    throw new Error("Unable to determine the contest timezone offset.");
  }

  const direction = match[1] === "+" ? 1 : -1;
  const offsetMinutes = direction * (Number(match[2]) * 60 + Number(match[3]));
  return new Date(Date.UTC(year, month - 1, day) - offsetMinutes * 60_000);
}

export function getContestWindow(contestDate: string): ContestWindow {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(contestDate)) {
    throw new Error("Contest date must use YYYY-MM-DD.");
  }

  const [openYear, openMonth, openDay] = addDays(contestDate, 0);
  const [submissionYear, submissionMonth, submissionDay] = addDays(contestDate, 1);
  const [votingYear, votingMonth, votingDay] = addDays(contestDate, 3);

  return {
    submissionsOpenAt: chicagoMidnight(openYear, openMonth, openDay),
    submissionsCloseAt: chicagoMidnight(submissionYear, submissionMonth, submissionDay),
    votingCloseAt: chicagoMidnight(votingYear, votingMonth, votingDay),
  };
}
