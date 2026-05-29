import { redirect } from "next/navigation";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { UserSearch } from "@/app/components/user-search";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

function getDisplayName(user: { name: string | null; username: string | null }) {
  return user.name?.trim() || user.username?.trim() || "Unnamed writer";
}

export default async function SearchPage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  const requests = await prisma.friendship.findMany({
    where: {
      addresseeId: userId,
      status: "PENDING",
      ignoredAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      message: true,
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
  });

  return (
    <ProtectedPageShell
      title="Social Discovery"
      description="Find kindred writers, send friend requests with a short note, and respond to requests waiting for you."
      panelClassName="max-w-7xl"
      showHomeLink
    >
      <UserSearch
        initialRequests={requests.map((request) => ({
          id: request.id,
          message: request.message,
          createdAt: request.createdAt.toISOString(),
          requester: {
            id: request.requester.id,
            displayName: getDisplayName(request.requester),
            username: request.requester.username,
            bio: request.requester.bio,
          },
        }))}
      />
    </ProtectedPageShell>
  );
}
