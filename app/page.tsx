import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { MobileDisclosure } from "@/app/components/mobile-disclosure";
import { PrimaryButton, ProgressRing, StreakChip, SurfaceCard } from "@/app/components/app-ui";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { authOptions } from "@/lib/auth";
import { getDailyAuthorAdvice, type AuthorAdvice } from "@/lib/author-advice";
import { prisma } from "@/lib/prisma";
import { getTodayWritingProgress } from "@/lib/writing-progress";

type RecentWork = {
  id: string;
  title: string | null;
  wordCount: number;
  status: string;
  updatedAt: Date;
};

type WritingStreak = {
  id: string;
  title: string;
  dailyTargetWords: number;
  streakGoalDays: number;
  currentStreakDays: number;
  bestStreakDays: number;
};

type ActivityDay = {
  date: Date;
  wordsWritten: number;
  targetWords: number;
  goalMet: boolean;
};

function formatRecentDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatActivityDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getWorkTitle(work: RecentWork) {
  return work.title?.trim() || "Untitled draft";
}

function getDisplayHandle(user: {
  name: string | null;
  username: string | null;
  email: string | null;
}) {
  if (user.username?.trim()) {
    return `@${user.username.trim()}`;
  }

  return user.name?.trim() || user.email?.trim() || "Your account";
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeUtcDate(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addUtcDays(date: Date, days: number) {
  const nextDate = new Date(date);

  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function getActivityMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function getActivityTone(day: ActivityDay | undefined) {
  if (!day || day.wordsWritten <= 0) {
    return "bg-[var(--paper-muted)]";
  }

  const ratio = day.wordsWritten / Math.max(day.targetWords, 1);

  if (ratio >= 1) {
    return "bg-[var(--sage-dark)]";
  }

  if (ratio >= 0.66) {
    return "bg-[var(--sage)]";
  }

  if (ratio >= 0.33) {
    return "bg-[var(--sage-soft)]";
  }

  return "bg-[var(--sunset-soft)]";
}

function ActivityGrid({
  activityDays,
  profileCreatedAt,
  today,
}: {
  activityDays: ActivityDay[];
  profileCreatedAt: Date;
  today: string;
}) {
  const activityByDate = new Map(
    activityDays.map((day) => [getDateKey(day.date), day])
  );
  const todayDate = normalizeUtcDate(new Date(`${today}T00:00:00.000Z`));
  const profileCreatedDate = normalizeUtcDate(profileCreatedAt);
  const displayStart =
    profileCreatedDate <= todayDate ? profileCreatedDate : todayDate;
  const rawCalendarStart = addUtcDays(displayStart, -displayStart.getUTCDay());
  const rawCalendarEnd = addUtcDays(todayDate, 6 - todayDate.getUTCDay());
  const rawWeekCount = Math.ceil(
    (rawCalendarEnd.getTime() - rawCalendarStart.getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );
  const balancedWeekCount = Math.max(12, Math.ceil(rawWeekCount / 4) * 4);
  const calendarStart = addUtcDays(
    rawCalendarEnd,
    -(balancedWeekCount * 7 - 1)
  );
  const cells = Array.from({ length: balancedWeekCount * 7 }, (_, index) =>
    addUtcDays(calendarStart, index)
  );
  const weeks = Array.from({ length: balancedWeekCount }, (_, weekIndex) =>
    cells.slice(weekIndex * 7, weekIndex * 7 + 7)
  );
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const rangeLabel = `${formatActivityDate(displayStart)} - ${formatActivityDate(
    todayDate
  )}`;

  return (
    <SurfaceCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-literary text-xl font-semibold text-[var(--charcoal)]">
            Writing calendar
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {rangeLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
          <span>Less</span>
          <span className="size-3 rounded-sm bg-[var(--paper-muted)]" />
          <span className="size-3 rounded-sm bg-[var(--sage-soft)]" />
          <span className="size-3 rounded-sm bg-[var(--sage)]" />
          <span className="size-3 rounded-sm bg-[var(--sage-dark)]" />
          <span>More</span>
        </div>
      </div>
      <div className="mt-5 min-w-0 pb-1">
        <div className="grid w-full grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2">
          <div aria-hidden="true" />
          <div
            className="grid min-w-0 gap-1"
            style={{
              gridTemplateColumns: `repeat(${balancedWeekCount}, minmax(0, 1fr))`,
            }}
          >
            {weeks.map((week, weekIndex) => {
              const monthStart = week.find(
                (date) => date?.getUTCDate() === 1
              );

              return (
                <div
                  className="min-w-0 truncate text-[0.65rem] font-bold uppercase leading-4 text-[var(--muted)]"
                  key={`month-${weekIndex}`}
                >
                  {monthStart ? getActivityMonthLabel(monthStart) : ""}
                </div>
              );
            })}
          </div>
          <div
            className="grid gap-1"
            style={{
              gridTemplateRows: "repeat(7, minmax(0, 1fr))",
            }}
          >
            {weekdayLabels.map((label) => (
              <div
                className="flex items-center justify-end text-[0.65rem] font-semibold leading-none text-[var(--muted)]"
                key={label}
              >
                {label}
              </div>
            ))}
          </div>
          <div
            className="grid grid-flow-col gap-1"
            style={{
              gridTemplateColumns: `repeat(${balancedWeekCount}, minmax(0, 1fr))`,
              gridTemplateRows: "repeat(7, minmax(0, 1fr))",
            }}
          >
            {cells.map((date, index) => {
              const isOutsideHistory =
                date < displayStart || date > todayDate;

              if (isOutsideHistory) {
                return (
                  <div
                    aria-hidden="true"
                    className="aspect-square w-full rounded-[4px] bg-[var(--paper-muted)] opacity-60"
                    key={`outside-${index}`}
                  />
                );
              }

              const key = getDateKey(date);
              const day = activityByDate.get(key);
              const isProfileCreatedDay =
                key === getDateKey(profileCreatedDate);
              const titleParts = [
                `${key}: ${(day?.wordsWritten ?? 0).toLocaleString()} words`,
              ];

              if (isProfileCreatedDay) {
                titleParts.push("profile created");
              }

              return (
                <div
                  aria-label={titleParts.join(", ")}
                  className={`aspect-square w-full rounded-[4px] ${getActivityTone(day)} ${
                    isProfileCreatedDay
                      ? "ring-2 ring-[var(--sunset)] ring-offset-1 ring-offset-white"
                      : ""
                  }`}
                  key={key}
                  title={titleParts.join(", ")}
                />
              );
            })}
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}

function AuthorAdviceCard({ advice }: { advice: AuthorAdvice }) {
  return (
    <SurfaceCard className="flex min-h-72 flex-col justify-center bg-[var(--paper-soft)] p-8">
      <section aria-labelledby="today-quote-heading">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div
            aria-hidden="true"
            className="font-literary text-5xl leading-none text-[var(--sunset)]"
          >
            &ldquo;
          </div>
          <h2
            className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]"
            id="today-quote-heading"
          >
            Today&apos;s quote
          </h2>
        </div>
        <blockquote className="font-literary text-2xl font-semibold leading-10 text-[var(--charcoal)]">
          {advice.quote}
        </blockquote>
        <cite className="mt-5 block text-sm font-bold not-italic text-[var(--sage-dark)]">
          {advice.author}
        </cite>
      </section>
    </SurfaceCard>
  );
}

function HomeSidebarContent({
  recentWorks,
  writingStreaks,
}: {
  recentWorks: RecentWork[];
  writingStreaks: WritingStreak[];
}) {
  return (
    <div className="space-y-7">
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
          Current streaks
        </h2>
        <div className="mt-3 space-y-3">
          {writingStreaks.length > 0 ? (
            writingStreaks.map((goal) => (
              <div
                className="rounded-2xl border border-[var(--line)] bg-white/70 p-4"
                key={goal.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[var(--charcoal)]">{goal.title}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {goal.dailyTargetWords.toLocaleString()} words daily
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-literary text-3xl font-bold leading-none text-[var(--sage-dark)]">
                      {goal.currentStreakDays}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                      days
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--paper-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--sage)]"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (goal.currentStreakDays /
                            Math.max(goal.streakGoalDays, 1)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Best streak: {goal.bestStreakDays} days
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-white/70 p-4 text-sm leading-6 text-[var(--muted)]">
              Set a writing goal from your profile to start tracking streaks.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
          Recent works
        </h2>
        <div className="mt-3 space-y-2">
          {recentWorks.length > 0 ? (
            recentWorks.map((work) => (
              <Link
                className="block rounded-2xl border border-[var(--line)] bg-white/70 p-4 transition hover:border-[var(--line-strong)] hover:bg-white"
                href={`/write?entryId=${work.id}`}
                key={work.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-[var(--charcoal)]">
                    {getWorkTitle(work)}
                  </p>
                  <span className="shrink-0 rounded-full bg-[var(--paper-muted)] px-2 py-1 text-xs font-bold text-[var(--sage-dark)]">
                    {work.status.toLowerCase()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {work.wordCount.toLocaleString()} words | Updated{" "}
                  {formatRecentDate(work.updatedAt)}
                </p>
              </Link>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-white/70 p-4 text-sm leading-6 text-[var(--muted)]">
              Your recent drafts and published pieces will appear here.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function HomeSidebar({
  recentWorks,
  writingStreaks,
}: {
  recentWorks: RecentWork[];
  writingStreaks: WritingStreak[];
}) {
  return (
    <aside className="hidden rounded-2xl bg-[var(--paper-soft)] p-5 lg:block">
      <HomeSidebarContent
        recentWorks={recentWorks}
        writingStreaks={writingStreaks}
      />
    </aside>
  );
}

function MobileHomeDrawer({
  displayHandle,
  recentWorks,
  writingStreaks,
}: {
  displayHandle: string;
  recentWorks: RecentWork[];
  writingStreaks: WritingStreak[];
}) {
  return (
    <MobileDisclosure
      className="lg:hidden"
      eyebrow={displayHandle}
      title="Profile Dashboard"
    >
      <HomeSidebarContent
        recentWorks={recentWorks}
        writingStreaks={writingStreaks}
      />
    </MobileDisclosure>
  );
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  if (!userId) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      name: true,
      username: true,
      email: true,
      createdAt: true,
    },
  });

  if (!currentUser) {
    redirect("/login");
  }

  const [recentWorks, writingStreaks, todayProgress, activityDays] =
    await Promise.all([
    prisma.entry.findMany({
      where: {
        authorId: userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        title: true,
        wordCount: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.wordGoal.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 3,
      select: {
        id: true,
        title: true,
        dailyTargetWords: true,
        streakGoalDays: true,
        currentStreakDays: true,
        bestStreakDays: true,
      },
    }),
    getTodayWritingProgress(prisma, userId),
    prisma.dailyProgress.findMany({
      where: {
        userId,
        date: {
          gte: normalizeUtcDate(currentUser.createdAt),
        },
      },
      orderBy: {
        date: "desc",
      },
      select: {
        date: true,
        wordsWritten: true,
        targetWords: true,
        goalMet: true,
      },
    }),
  ]);

  const pages = [
    { href: "/write", label: "Continue Writing", caption: "Open the focused editor." },
    { href: "/library", label: "Personal Library", caption: "Review drafts and public pieces." },
    { href: "/explore", label: "Prompts", caption: "Find a starting point." },
    { href: "/search", label: "Social Discovery", caption: "Find writers and requests." },
  ];
  const progressPercent = Math.round(
    (todayProgress.wordsWritten / Math.max(todayProgress.targetWords, 1)) * 100
  );
  const authorAdvice = getDailyAuthorAdvice(todayProgress.date);

  return (
    <ProtectedPageShell
      title="Daily Hub"
      description="Pick up where you left off, check your writing momentum, or move into another part of the app."
      panelClassName="max-w-7xl"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <MobileHomeDrawer
            displayHandle={getDisplayHandle(currentUser)}
            recentWorks={recentWorks}
            writingStreaks={writingStreaks}
          />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <SurfaceCard className="grid items-center gap-8 p-8 md:grid-cols-[auto_minmax(0,1fr)]">
              <ProgressRing
                caption={`of ${todayProgress.targetWords.toLocaleString()} words`}
                label={todayProgress.wordsWritten.toLocaleString()}
                value={progressPercent}
              />
              <div>
                <StreakChip>
                  {todayProgress.currentStreakDays} day streak
                </StreakChip>
                <h2 className="mt-5 font-literary text-4xl font-bold leading-tight text-[var(--charcoal)]">
                  Steady progress, {getDisplayHandle(currentUser).replace(/^@/, "")}.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-[var(--charcoal)]/75">
                  Every saved draft builds your private daily writing momentum.
                  Your best streak is {todayProgress.bestStreakDays} days.
                </p>
                <PrimaryButton className="mt-6" href="/write">
                  Continue Writing
                </PrimaryButton>
              </div>
            </SurfaceCard>
            <AuthorAdviceCard advice={authorAdvice} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {pages.map((page) => (
              <Link
                key={page.href}
                className="rounded-2xl border border-[var(--line)] bg-white/70 px-5 py-4 transition hover:border-[var(--line-strong)] hover:bg-white"
                href={page.href}
              >
                <span className="font-literary text-xl font-semibold text-[var(--charcoal)]">
                  {page.label}
                </span>
                <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">
                  {page.caption}
                </span>
              </Link>
            ))}
          </div>

          <ActivityGrid
            activityDays={activityDays}
            profileCreatedAt={currentUser.createdAt}
            today={todayProgress.date}
          />
        </div>

        <HomeSidebar recentWorks={recentWorks} writingStreaks={writingStreaks} />
      </div>
    </ProtectedPageShell>
  );
}
