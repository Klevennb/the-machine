import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { StreakChip, SurfaceCard } from "@/app/components/app-ui";
import { ProfileSettings } from "@/app/components/profile-settings";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getDisplayName(user: { name: string | null; username: string | null }) {
  return user.name?.trim() || user.username?.trim() || "Unnamed writer";
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  if (!userId) {
    redirect("/login");
  }

  const [user, entryStats] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      email: true,
      timezone: true,
      profileVisibility: true,
      showEmailOnProfile: true,
      allowNsfwStories: true,
      favoriteGenres: true,
      mutedGenres: true,
      feedIncludesPublic: true,
      feedIncludesFriends: true,
      feedIncludesPrompts: true,
      dailyTargetWords: true,
      streakGoalDays: true,
      showProfileSection: true,
      showPreferencesSection: true,
      showFeedSection: true,
      showGoalsSection: true,
      showFriendsSection: true,
      updatedAt: true,
      customGoals: {
        where: {
          isCompleted: false,
        },
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          title: true,
          description: true,
          isCompleted: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      sentFriendRequests: {
        where: {
          status: "ACCEPTED",
        },
        orderBy: {
          acceptedAt: "desc",
        },
        select: {
          id: true,
          acceptedAt: true,
          createdAt: true,
          addressee: {
            select: {
              id: true,
              name: true,
              username: true,
              bio: true,
            },
          },
        },
      },
      receivedFriends: {
        where: {
          status: "ACCEPTED",
        },
        orderBy: {
          acceptedAt: "desc",
        },
        select: {
          id: true,
          acceptedAt: true,
          createdAt: true,
          requester: {
            select: {
              id: true,
              name: true,
              username: true,
              bio: true,
            },
          },
        },
      },
      },
    }),
    prisma.entry.aggregate({
      where: {
        authorId: userId,
      },
      _sum: {
        wordCount: true,
      },
      _count: {
        id: true,
      },
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  return (
    <ProtectedPageShell
      title="Profile"
      description="Manage your public presence, goals, feed curation, and writing preferences."
      panelClassName="max-w-7xl"
      showHomeLink
    >
      <div className="space-y-8">
        <SurfaceCard className="grid gap-6 p-8 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <div className="grid size-28 place-items-center rounded-full bg-[var(--sage-soft)] font-literary text-4xl font-bold text-[var(--sage-dark)]">
            {getDisplayName(user).slice(0, 1).toUpperCase()}
          </div>
          <div>
            <StreakChip tone="sage">{user.profileVisibility.toLowerCase()} profile</StreakChip>
            <h2 className="mt-4 font-literary text-4xl font-bold text-[var(--charcoal)]">
              {getDisplayName(user)}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--charcoal)]/75">
              {user.bio?.trim() ||
                "Shape how other writers see you and keep your creative routines visible."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-center">
            <div>
              <p className="font-literary text-4xl font-bold text-[var(--sage-dark)]">
                {(entryStats._sum.wordCount ?? 0).toLocaleString()}
              </p>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                words
              </p>
            </div>
            <div>
              <p className="font-literary text-4xl font-bold text-[var(--sunset)]">
                {entryStats._count.id.toLocaleString()}
              </p>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                works
              </p>
            </div>
          </div>
        </SurfaceCard>

        <ProfileSettings
          initialFriends={[
          ...user.sentFriendRequests.map((friendship) => ({
            id: friendship.addressee.id,
            friendshipId: friendship.id,
            displayName: getDisplayName(friendship.addressee),
            username: friendship.addressee.username,
            bio: friendship.addressee.bio,
            friendsSince: (
              friendship.acceptedAt ?? friendship.createdAt
            ).toISOString(),
          })),
          ...user.receivedFriends.map((friendship) => ({
            id: friendship.requester.id,
            friendshipId: friendship.id,
            displayName: getDisplayName(friendship.requester),
            username: friendship.requester.username,
            bio: friendship.requester.bio,
            friendsSince: (
              friendship.acceptedAt ?? friendship.createdAt
            ).toISOString(),
          })),
        ].sort(
          (left, right) =>
            new Date(right.friendsSince).getTime() -
            new Date(left.friendsSince).getTime()
        )}
          initialGoals={user.customGoals.map((goal) => ({
          ...goal,
          completedAt: goal.completedAt?.toISOString() ?? null,
          createdAt: goal.createdAt.toISOString(),
          updatedAt: goal.updatedAt.toISOString(),
        }))}
          initialUser={{
          id: user.id,
          name: user.name,
          username: user.username,
          bio: user.bio,
          email: user.email,
          timezone: user.timezone,
          profileVisibility: user.profileVisibility,
          showEmailOnProfile: user.showEmailOnProfile,
          allowNsfwStories: user.allowNsfwStories,
          favoriteGenres: user.favoriteGenres,
          mutedGenres: user.mutedGenres,
          feedIncludesPublic: user.feedIncludesPublic,
          feedIncludesFriends: user.feedIncludesFriends,
          feedIncludesPrompts: user.feedIncludesPrompts,
          dailyTargetWords: user.dailyTargetWords,
          streakGoalDays: user.streakGoalDays,
          showProfileSection: user.showProfileSection,
          showPreferencesSection: user.showPreferencesSection,
          showFeedSection: user.showFeedSection,
          showGoalsSection: user.showGoalsSection,
          showFriendsSection: user.showFriendsSection,
          updatedAt: user.updatedAt.toISOString(),
          }}
        />
      </div>
    </ProtectedPageShell>
  );
}
