import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
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

  const user = await prisma.user.findUnique({
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
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <ProtectedPageShell
      title="Profile"
      description="Manage your profile, writing goals, feed curation, and reading preferences."
      panelClassName="max-w-7xl"
      showHomeLink
    >
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
    </ProtectedPageShell>
  );
}
