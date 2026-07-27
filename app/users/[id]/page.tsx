import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { StreakChip, SurfaceCard } from "@/app/components/app-ui";
import { ProfileFriendButton } from "@/app/components/profile-friend-button";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { invariant } from "@/lib/invariant";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { getProfileStoryVisibilityFilter } from "@/lib/stories";

type UserProfilePageProps = {
  params: Promise<{ id: string }>;
};

function getDisplayName(user: { name: string | null; username: string | null }) {
  invariant(Boolean(user), "user is required.");

  return user.name?.trim() || user.username?.trim() || "Unnamed writer";
}

function formatDate(value: Date | null) {
  invariant(value === null || value instanceof Date, "value must be a Date or null.");

  if (!value) {
    return "Not made public";
  }

  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPreview(entry: { summary: string | null; plainText: string | null }) {
  invariant(Boolean(entry), "entry is required.");

  const preview = entry.summary?.trim() || entry.plainText?.trim();

  if (!preview) {
    return "No preview available.";
  }

  return preview.replace(/\s+/g, " ").slice(0, 220);
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  invariant(params instanceof Promise, "params must be a Promise.");

  const viewerId = await getCurrentUserId();

  if (!viewerId) {
    redirect("/login");
  }

  const { id: profileUserId } = await params;
  const isOwnProfile = viewerId === profileUserId;

  const relationship = isOwnProfile
    ? null
    : await prisma.friendship.findFirst({
        where: {
          OR: [
            {
              requesterId: viewerId,
              addresseeId: profileUserId,
            },
            {
              requesterId: profileUserId,
              addresseeId: viewerId,
            },
          ],
        },
        select: {
          id: true,
          requesterId: true,
          status: true,
        },
      });

  const visibleStoryFilter = await getProfileStoryVisibilityFilter({
    db: prisma,
    profileUserId,
    viewerId,
  });

  const user = await prisma.user.findUnique({
    where: {
      id: profileUserId,
    },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      email: true,
      profileVisibility: true,
      showEmailOnProfile: true,
      favoriteGenres: true,
      createdAt: true,
      entries: {
        where: {
          status: "PUBLISHED",
          visibility: visibleStoryFilter,
        },
        orderBy: {
          publishedAt: "desc",
        },
        select: {
          id: true,
          title: true,
          summary: true,
          plainText: true,
          wordCount: true,
          storyGenre: true,
          customStoryGenre: true,
          visibility: true,
          isNsfw: true,
          publishedAt: true,
          contestEntry: { select: { status: true, contest: { select: { contestDate: true } } } },
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const canViewProfileDetails =
    isOwnProfile ||
    user.profileVisibility === "PUBLIC" ||
    user.profileVisibility === "MEMBERS";

  const displayName = getDisplayName(user);
  const visibleEmail =
    canViewProfileDetails && user.showEmailOnProfile ? user.email : null;
  const visibleRelationship = relationship
    ? {
        id: relationship.id,
        status: relationship.status,
        direction:
          relationship.requesterId === viewerId
            ? ("outgoing" as const)
            : ("incoming" as const),
      }
    : null;

  return (
    <ProtectedPageShell
      title={displayName}
      description="Public profile details and public stories are visible here."
      panelClassName="max-w-6xl"
      showHomeLink
    >
      <div className="space-y-8">
        <SurfaceCard className="grid gap-6 p-8 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
          <div className="grid size-28 place-items-center rounded-full bg-[var(--sage-soft)] font-literary text-4xl font-bold text-[var(--sage-dark)]">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <StreakChip tone="sage">
              {user.username ? `@${user.username}` : "writer profile"}
            </StreakChip>
            <h2 className="mt-4 font-literary text-4xl font-bold text-[var(--charcoal)]">
              {displayName}
            </h2>
            {canViewProfileDetails && user.bio ? (
              <p className="mt-3 max-w-2xl whitespace-pre-wrap font-literary text-lg leading-8 text-[var(--charcoal)]/75">
                {user.bio}
              </p>
            ) : null}
          </div>
          {!isOwnProfile ? (
            <ProfileFriendButton
              initialRelationship={visibleRelationship}
              profileUserId={user.id}
            />
          ) : null}
        </SurfaceCard>

        <div className="grid gap-6 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]">
        <aside className="rounded-2xl border border-[var(--line)] bg-white/70 p-5 shadow-[var(--shadow-soft)]">
          <div className="space-y-3 text-sm text-[var(--muted)]">
            <p>
              <span className="font-bold text-[var(--charcoal)]">Username:</span>{" "}
              {user.username ? `@${user.username}` : "Not set"}
            </p>
            {canViewProfileDetails ? (
              <p>
                <span className="font-medium text-slate-800">
                  Member since:
                </span>{" "}
                {formatDate(user.createdAt)}
              </p>
            ) : null}
            {visibleEmail ? (
              <p>
                <span className="font-bold text-[var(--charcoal)]">Email:</span>{" "}
                {visibleEmail}
              </p>
            ) : null}
          </div>

          {!canViewProfileDetails ? (
            <p className="mt-5 rounded-2xl bg-[var(--paper-soft)] p-4 text-sm leading-6 text-[var(--muted)]">
              This writer has not made profile details public.
            </p>
          ) : null}

          {canViewProfileDetails && user.bio ? (
            <div className="mt-5">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                Bio
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--charcoal)]/75">
                {user.bio}
              </p>
            </div>
          ) : null}

          {canViewProfileDetails && user.favoriteGenres.length > 0 ? (
            <div className="mt-5">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                Favorite Genres
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {user.favoriteGenres.map((genre) => (
                  <span
                    className="rounded-full bg-[var(--sage-soft)] px-3 py-1.5 text-sm font-semibold text-[var(--sage-dark)]"
                    key={genre}
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

        </aside>

        <section className="min-w-0">
          <h2 className="font-literary text-3xl font-semibold text-[var(--charcoal)]">
            Visible Stories
          </h2>
          <div className="mt-4 space-y-4">
            {user.entries.length === 0 ? (
              <div className="rounded-2xl bg-[var(--paper-soft)] p-5 text-sm text-[var(--muted)]">
                No stories are visible to you right now.
              </div>
            ) : null}

            {user.entries.map((entry) => (
              <article
                className="rounded-2xl border border-[var(--line)] bg-white/75 p-5 shadow-[var(--shadow-soft)]"
                key={entry.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      className="break-words font-literary text-2xl font-semibold text-[var(--charcoal)] hover:text-[var(--sage-dark)]"
                      href={`/stories/${entry.id}`}
                    >
                      {entry.title?.trim() || "Untitled Entry"}
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-[var(--muted)]">
                      <span>{entry.wordCount} words</span>
                      <span>Made public {formatDate(entry.publishedAt)}</span>
                      <span>{entry.visibility.toLowerCase()}</span>
                      {entry.storyGenre ? <span>{entry.storyGenre === "Other" && entry.customStoryGenre ? entry.customStoryGenre : entry.storyGenre}</span> : null}
                      {entry.isNsfw ? <span>NSFW</span> : null}
                      {entry.contestEntry?.status === "ACTIVE" ? <Link className="font-bold text-[var(--sunset)]" href={`/contest/${entry.contestEntry.contest.contestDate.toISOString().slice(0, 10)}`}>Daily contest</Link> : null}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  {getPreview(entry)}
                </p>
              </article>
            ))}
          </div>
        </section>
        </div>
      </div>
    </ProtectedPageShell>
  );
}
