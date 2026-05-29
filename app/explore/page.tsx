import { redirect } from "next/navigation";
import Link from "next/link";
import { PrimaryButton, StreakChip, SurfaceCard } from "@/app/components/app-ui";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
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
  return prompts.reduce<Record<string, typeof prompts>>((groups, prompt) => {
    groups[prompt.genre] = [...(groups[prompt.genre] ?? []), prompt];
    return groups;
  }, {});
}

export default async function ExplorePage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  const prompts = await prisma.prompt.findMany({
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
  });
  const byGenre = groupedPrompts(prompts);

  return (
    <ProtectedPageShell
      title="Prompts"
      description="Find your next story from a quieter, more focused prompt shelf."
      showHomeLink
    >
      <div className="space-y-12">
        {GENRE_ORDER.map((genre) => {
          const genrePrompts = (byGenre[genre] ?? []).slice(0, 4);

          if (genrePrompts.length === 0) {
            return null;
          }

          return (
            <section key={genre}>
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="font-literary text-3xl font-semibold text-[var(--charcoal)]">
                  {genre}
                </h2>
                <div className="h-px flex-1 bg-[var(--line)]" />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {genrePrompts.map((prompt) => (
                  <SurfaceCard
                    className="flex min-h-56 flex-col justify-between p-6"
                    key={prompt.id}
                  >
                    <div>
                      <StreakChip tone="sage">
                        {prompt.tags[0] ?? prompt.genre}
                      </StreakChip>
                      <h3 className="mt-5 font-literary text-2xl font-semibold text-[var(--charcoal)]">
                        {prompt.title}
                      </h3>
                      <p className="mt-3 font-literary text-base italic leading-7 text-[var(--charcoal)]/75">
                        {prompt.body}
                      </p>
                    </div>
                    <PrimaryButton className="mt-6 self-start" href="/write">
                      Start Writing
                    </PrimaryButton>
                  </SurfaceCard>
                ))}
              </div>
            </section>
          );
        })}

        <section className="overflow-hidden rounded-3xl bg-[var(--sage)] p-8 text-white shadow-[var(--shadow-soft)] md:p-10">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/70">
                Premium collection
              </p>
              <h2 className="mt-4 font-literary text-4xl font-bold leading-tight">
                Mastering the quiet first page
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
                Start with one thoughtful prompt, then shape it into a draft in
                the focused editor.
              </p>
            </div>
            <Link
              className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-bold text-[var(--sage-dark)]"
              href="/write"
            >
              Open Editor
            </Link>
          </div>
        </section>
      </div>
    </ProtectedPageShell>
  );
}
