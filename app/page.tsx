import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { MobileDisclosure } from "@/app/components/mobile-disclosure";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

function formatRecentDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
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

function HomeSidebarContent({
  recentWorks,
  writingStreaks,
}: {
  recentWorks: RecentWork[];
  writingStreaks: WritingStreak[];
}) {
  return (
    <div className="space-y-7">
      <div>
        <Link
          className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          href="/profile"
        >
          Profile
        </Link>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Current streaks
        </h2>
        <div className="mt-3 space-y-3">
          {writingStreaks.length > 0 ? (
            writingStreaks.map((goal) => (
              <div
                className="rounded-xl border border-slate-200 bg-white p-4"
                key={goal.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-950">{goal.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {goal.dailyTargetWords.toLocaleString()} words daily
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold leading-none text-amber-600">
                      {goal.currentStreakDays}
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                      days
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-400"
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
                <p className="mt-2 text-xs text-slate-500">
                  Best streak: {goal.bestStreakDays} days
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-500">
              Set a writing goal from your profile to start tracking streaks.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Recent works
        </h2>
        <div className="mt-3 space-y-2">
          {recentWorks.length > 0 ? (
            recentWorks.map((work) => (
              <Link
                className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
                href={`/write?entryId=${work.id}`}
                key={work.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-950">
                    {getWorkTitle(work)}
                  </p>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {work.status.toLowerCase()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {work.wordCount.toLocaleString()} words | Updated{" "}
                  {formatRecentDate(work.updatedAt)}
                </p>
              </Link>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-500">
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
    <aside className="hidden rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:block">
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

  const [currentUser, recentWorks, writingStreaks] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        name: true,
        username: true,
        email: true,
      },
    }),
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
  ]);

  if (!currentUser) {
    redirect("/login");
  }

  const pages = [
    { href: "/write", label: "Write" },
    { href: "/library", label: "Library" },
    { href: "/explore", label: "Explore" },
    { href: "/search", label: "Search" },
  ];

  return (
    <ProtectedPageShell
      title="Home"
      description="Pick up where you left off, check your writing momentum, or move into another part of the app."
      panelClassName="max-w-7xl"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <MobileHomeDrawer
            displayHandle={getDisplayHandle(currentUser)}
            recentWorks={recentWorks}
            writingStreaks={writingStreaks}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {pages.map((page) => (
              <Link
                key={page.href}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-base font-medium text-slate-800 transition hover:border-slate-300 hover:bg-white"
                href={page.href}
              >
                {page.label}
              </Link>
            ))}
          </div>
        </div>

        <HomeSidebar recentWorks={recentWorks} writingStreaks={writingStreaks} />
      </div>
    </ProtectedPageShell>
  );
}
