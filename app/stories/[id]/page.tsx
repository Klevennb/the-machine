import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { StreakChip, SurfaceCard } from "@/app/components/app-ui";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { invariant } from "@/lib/invariant";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { canViewStory } from "@/lib/stories";

type StoryPageProps = {
  params: Promise<{ id: string }>;
};

function getDisplayName(user: { name: string | null; username: string | null }) {
  invariant(Boolean(user), "user is required.");

  return user.name?.trim() || user.username?.trim() || "Unnamed writer";
}

function formatDate(value: Date | null) {
  invariant(value === null || value instanceof Date, "value must be a Date or null.");

  if (!value) {
    return "Not published";
  }

  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function StoryPage({ params }: StoryPageProps) {
  invariant(params instanceof Promise, "params must be a Promise.");

  const viewerId = await getCurrentUserId();

  if (!viewerId) {
    redirect("/login");
  }

  const { id } = await params;
  const entry = await prisma.entry.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      authorId: true,
      title: true,
      plainText: true,
      wordCount: true,
      publicAuthorNote: true,
      visibility: true,
      status: true,
      isNsfw: true,
      publishedAt: true,
      contestEntry: { select: { status: true, contest: { select: { contestDate: true } } } },
      author: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  });

  if (!entry) {
    notFound();
  }

  const canView = await canViewStory({
    db: prisma,
    entry,
    viewerId,
  });

  if (!canView) {
    notFound();
  }

  const authorName = getDisplayName(entry.author);

  return (
    <ProtectedPageShell
      title={entry.title?.trim() || "Untitled Entry"}
      description={`By ${authorName}`}
      panelClassName="max-w-4xl"
      showHomeLink
    >
      <article className="space-y-6">
        <SurfaceCard className="p-6">
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-[var(--muted)]">
            <Link
              className="font-bold text-[var(--sage-dark)] hover:text-[var(--charcoal)]"
              href={`/users/${entry.author.id}`}
            >
              {authorName}
            </Link>
            <span>{entry.wordCount.toLocaleString()} words</span>
            <span>{formatDate(entry.publishedAt)}</span>
            <StreakChip tone="sage">{entry.visibility.toLowerCase()}</StreakChip>
            {entry.isNsfw ? <StreakChip>NSFW</StreakChip> : null}
            {entry.contestEntry?.status === "ACTIVE" ? <Link className="font-bold text-[var(--sunset)]" href={`/contest/${entry.contestEntry.contest.contestDate.toISOString().slice(0, 10)}`}>Daily contest entry</Link> : null}
          </div>

          {entry.publicAuthorNote ? (
            <p className="mt-5 rounded-2xl bg-[var(--paper-soft)] p-4 text-sm leading-6 text-[var(--charcoal)]/75">
              {entry.publicAuthorNote}
            </p>
          ) : null}
        </SurfaceCard>

        <SurfaceCard className="p-6 md:p-8">
          <div className="whitespace-pre-wrap font-literary text-lg leading-9 text-[var(--charcoal)]">
            {entry.plainText?.trim() || "No content yet."}
          </div>
        </SurfaceCard>
      </article>
    </ProtectedPageShell>
  );
}
