import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { UserSettings } from "@/app/components/user-settings";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function UserPage() {
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
      updatedAt: true,
      wordGoals: {
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          title: true,
          description: true,
          dailyTargetWords: true,
          isActive: true,
          currentStreakDays: true,
          bestStreakDays: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <ProtectedPageShell
      title="User"
      description="Manage your profile, writing goals, feed curation, and reading preferences."
      panelClassName="max-w-7xl"
      showHomeLink
    >
      <UserSettings
        initialGoals={user.wordGoals.map((goal) => ({
          ...goal,
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
          updatedAt: user.updatedAt.toISOString(),
        }}
      />
    </ProtectedPageShell>
  );
}
