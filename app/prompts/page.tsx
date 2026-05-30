import Link from "next/link";
import { PromptGallery } from "@/app/prompts/prompt-gallery";
import { normalizeGenre } from "@/lib/community";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

type PromptsPageProps = {
  searchParams: Promise<{
    genre?: string | string[];
    q?: string | string[];
    sort?: string | string[];
  }>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function PromptsPage({ searchParams }: PromptsPageProps) {
  const params = await searchParams;
  const currentUserId = await getCurrentUserId();
  const query = getParam(params.q).trim();
  const genre = getParam(params.genre).trim();
  const normalizedGenre = normalizeGenre(genre);
  const sort = getParam(params.sort) === "recent" ? "recent" : "popular";

  const where = {
    status: "APPROVED" as const,
    ...(normalizedGenre ? { normalizedGenre } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { body: { contains: query, mode: "insensitive" as const } },
            { genre: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [prompts, genreRows] = await Promise.all([
    prisma.writingPrompt.findMany({
      where,
      orderBy:
        sort === "recent"
          ? [{ approvedAt: "desc" }, { createdAt: "desc" }]
          : [{ popularityScore: "desc" }, { approvedAt: "desc" }],
      take: 48,
      select: {
        id: true,
        title: true,
        body: true,
        genre: true,
        voteCount: true,
        usageCount: true,
        popularityScore: true,
        author: {
          select: {
            name: true,
            username: true,
          },
        },
        votes: {
          where: {
            userId: currentUserId ?? "",
          },
          select: {
            id: true,
          },
        },
      },
    }),
    prisma.writingPrompt.findMany({
      where: {
        status: "APPROVED",
      },
      distinct: ["normalizedGenre"],
      orderBy: {
        genre: "asc",
      },
      select: {
        genre: true,
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--line)] bg-white/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 md:px-10">
          <Link
            className="font-literary text-3xl font-bold text-[var(--sage-dark)]"
            href={currentUserId ? "/" : "/login"}
          >
            WriteNow
          </Link>
          <nav className="flex items-center gap-3 text-sm font-bold">
            <Link className="text-[var(--sage-dark)]" href="/prompts">
              Prompts
            </Link>
            <Link
              className="text-[var(--muted)] hover:text-[var(--sage-dark)]"
              href="/submit-prompt"
            >
              Submit Prompt
            </Link>
            <Link
              className="app-button-secondary px-4 py-2"
              href={currentUserId ? "/" : "/login"}
            >
              {currentUserId ? "Hub" : "Sign In"}
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 md:px-10 md:py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-3xl">
            <h1 className="font-literary text-4xl font-bold leading-tight text-[var(--charcoal)] md:text-5xl">
              Community Prompts
            </h1>
            <p className="mt-3 text-base leading-7 text-[var(--charcoal)]/80">
              Browse approved writing prompts from the WriteNow community.
            </p>
          </div>
        </div>
        <PromptGallery
          currentGenre={genre}
          currentQuery={query}
          currentSort={sort}
          genres={genreRows.map((row) => row.genre)}
          prompts={prompts}
        />
      </main>
    </div>
  );
}
