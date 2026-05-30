import Link from "next/link";
import { ArrowUp, PenLine } from "lucide-react";
import { voteForPrompt, usePrompt } from "@/app/prompts/actions";
import { PrimaryButton, StreakChip, SurfaceCard } from "@/app/components/app-ui";

type PromptGalleryPrompt = {
  id: string;
  title: string;
  body: string;
  genre: string;
  voteCount: number;
  usageCount: number;
  popularityScore: number;
  author: {
    name: string | null;
    username: string | null;
  };
  votes: { id: string }[];
};

function getAuthorName(prompt: PromptGalleryPrompt) {
  return (
    prompt.author.username?.trim() ||
    prompt.author.name?.trim() ||
    "WriteNow writer"
  );
}

export function PromptGallery({
  currentGenre,
  currentQuery,
  currentSort,
  genres,
  prompts,
}: {
  currentGenre: string;
  currentQuery: string;
  currentSort: string;
  genres: string[];
  prompts: PromptGalleryPrompt[];
}) {
  return (
    <div className="space-y-6">
      <form className="app-card grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_14rem_10rem_auto]">
        <input
          className="app-field px-4 py-3 text-sm"
          defaultValue={currentQuery}
          name="q"
          placeholder="Search prompts"
        />
        <select
          className="app-field px-4 py-3 text-sm"
          defaultValue={currentGenre}
          name="genre"
        >
          <option value="">All genres</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
        <select
          className="app-field px-4 py-3 text-sm"
          defaultValue={currentSort}
          name="sort"
        >
          <option value="popular">Popular</option>
          <option value="recent">Recent</option>
        </select>
        <button className="app-button-secondary px-5 py-2.5 text-sm" type="submit">
          Filter
        </button>
      </form>

      {prompts.length === 0 ? (
        <SurfaceCard className="p-8 text-center">
          <h2 className="font-literary text-2xl font-semibold text-[var(--charcoal)]">
            No approved prompts found
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Try another genre or search term.
          </p>
          <PrimaryButton className="mt-5" href="/submit-prompt">
            Submit a Prompt
          </PrimaryButton>
        </SurfaceCard>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {prompts.map((prompt) => {
            const hasVoted = prompt.votes.length > 0;

            return (
              <SurfaceCard
                className="flex min-h-80 flex-col justify-between p-6"
                key={prompt.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StreakChip tone="sage">{prompt.genre}</StreakChip>
                    <span className="text-xs font-bold text-[var(--muted)]">
                      Score {prompt.popularityScore}
                    </span>
                  </div>
                  <h2 className="mt-5 font-literary text-2xl font-semibold leading-tight text-[var(--charcoal)]">
                    {prompt.title}
                  </h2>
                  <p className="mt-3 font-literary text-base italic leading-7 text-[var(--charcoal)]/75">
                    {prompt.body}
                  </p>
                  <p className="mt-4 text-sm font-semibold text-[var(--muted)]">
                    By {getAuthorName(prompt)}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2 text-sm font-semibold text-[var(--muted)]">
                    <span>{prompt.voteCount} votes</span>
                    <span>{prompt.usageCount} uses</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={voteForPrompt}>
                      <input name="promptId" type="hidden" value={prompt.id} />
                      <button
                        className="app-button-secondary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={hasVoted}
                        type="submit"
                      >
                        <ArrowUp className="size-4" />
                        {hasVoted ? "Voted" : "Vote"}
                      </button>
                    </form>
                    <form action={usePrompt}>
                      <input name="promptId" type="hidden" value={prompt.id} />
                      <button
                        className="app-button-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                        type="submit"
                      >
                        <PenLine className="size-4" />
                        Use
                      </button>
                    </form>
                  </div>
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}

      <div className="flex justify-center">
        <Link
          className="app-button-secondary inline-flex px-5 py-2.5 text-sm"
          href="/submit-prompt"
        >
          Submit a Prompt
        </Link>
      </div>
    </div>
  );
}
