import { redirect } from "next/navigation";
import { ExploreTabs } from "@/app/explore/explore-tabs";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { invariant } from "@/lib/invariant";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

const GENRE_ORDER = ["Fantasy", "Science Fiction", "Memoir", "Poetry"];

function groupedPrompts(
  prompts: Array<{
    id: string;
    title: string;
    body: string;
    genre: string;
    tags: string[];
  }>
) {
  invariant(Array.isArray(prompts), "prompts must be an array.");

  return prompts.reduce<Record<string, typeof prompts>>((groups, prompt) => {
    groups[prompt.genre] = [...(groups[prompt.genre] ?? []), prompt];
    return groups;
  }, {});
}

export default async function ExplorePage() {
  invariant(Array.isArray(GENRE_ORDER), "genre order must be configured.");

  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  const [user, prompts] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        allowNsfwStories: true,
      },
    }),
    prisma.prompt.findMany({
      where: {
        genre: {
          in: GENRE_ORDER,
        },
      },
      orderBy: [
        {
          isFeatured: "desc",
        },
        {
          title: "asc",
        },
      ],
      take: 24,
      select: {
        id: true,
        title: true,
        body: true,
        genre: true,
        tags: true,
      },
    }),
  ]);
  const byGenre = groupedPrompts(prompts);

  return (
    <ProtectedPageShell
      title="Explore"
      description="Discover stories from friends and the wider writing shelf, or browse prompts."
      showHomeLink
    >
      <ExploreTabs
        genreOrder={GENRE_ORDER}
        initialAllowNsfw={user?.allowNsfwStories ?? false}
        promptsByGenre={byGenre}
      />
    </ProtectedPageShell>
  );
}
