import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProfileFriendButton } from "@/app/components/profile-friend-button";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type UserProfilePageProps = {
  params: Promise<{ id: string }>;
};

function getDisplayName(user: { name: string | null; username: string | null }) {
  return user.name?.trim() || user.username?.trim() || "Unnamed writer";
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Not published";
  }

  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPreview(entry: { summary: string | null; plainText: string | null }) {
  const preview = entry.summary?.trim() || entry.plainText?.trim();

  if (!preview) {
    return "No preview available.";
  }

  return preview.replace(/\s+/g, " ").slice(0, 220);
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as { id?: string } | undefined)?.id ?? null;

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
          visibility: "PUBLIC",
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
          visibility: true,
          publishedAt: true,
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
      description="Public profile details and published public stories are visible here."
      panelClassName="max-w-6xl"
      showHomeLink
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-800">Username:</span>{" "}
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
                <span className="font-medium text-slate-800">Email:</span>{" "}
                {visibleEmail}
              </p>
            ) : null}
          </div>

          {!canViewProfileDetails ? (
            <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
              This writer has not made profile details public.
            </p>
          ) : null}

          {canViewProfileDetails && user.bio ? (
            <div className="mt-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Bio
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {user.bio}
              </p>
            </div>
          ) : null}

          {canViewProfileDetails && user.favoriteGenres.length > 0 ? (
            <div className="mt-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Favorite Genres
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {user.favoriteGenres.map((genre) => (
                  <span
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
                    key={genre}
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {!isOwnProfile ? (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <ProfileFriendButton
                initialRelationship={visibleRelationship}
                profileUserId={user.id}
              />
            </div>
          ) : null}
        </aside>

        <section className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-950">
            Published Stories
          </h2>
          <div className="mt-4 space-y-4">
            {user.entries.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                No stories are visible to you right now.
              </div>
            ) : null}

            {user.entries.map((entry) => (
              <article
                className="rounded-2xl border border-slate-200 bg-white p-5"
                key={entry.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-semibold text-slate-950">
                      {entry.title?.trim() || "Untitled Entry"}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{entry.wordCount} words</span>
                      <span>Published {formatDate(entry.publishedAt)}</span>
                      <span>{entry.visibility.toLowerCase()}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {getPreview(entry)}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </ProtectedPageShell>
  );
}
