"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PrimaryButton, StreakChip, SurfaceCard } from "@/app/components/app-ui";
import { invariant, invariantString } from "@/lib/invariant";

type Prompt = {
  id: string;
  title: string;
  body: string;
  genre: string;
  tags: string[];
};

type Story = {
  id: string;
  title: string;
  preview: string;
  wordCount: number;
  visibility: "PRIVATE" | "FRIENDS" | "PUBLIC";
  isNsfw: boolean;
  publishedAt: string | null;
  author: {
    id: string;
    name: string;
    username: string | null;
  };
};

type ExploreTabsProps = {
  initialAllowNsfw: boolean;
  promptsByGenre: Record<string, Prompt[]>;
  genreOrder: string[];
};

type ExploreStoriesResponse = {
  ok?: true;
  data?: {
    stories?: Story[];
  };
  stories?: Story[];
  error?: {
    message?: string;
  };
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not published";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function readApiJson<T>(response: Response): Promise<T | null> {
  invariant(response instanceof Response, "response must be a Response.");

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function getStories(data: ExploreStoriesResponse | null) {
  if (!data) {
    return [];
  }

  if (data.data?.stories) {
    return data.data.stories;
  }

  return data.stories ?? [];
}

function SegmentedButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
        active
          ? "bg-[var(--sage)] text-white"
          : "text-[var(--sage-dark)] hover:bg-white"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function StoriesTab({ initialAllowNsfw }: { initialAllowNsfw: boolean }) {
  invariant(typeof initialAllowNsfw === "boolean", "initialAllowNsfw must be boolean.");

  const [source, setSource] = useState<"friends" | "random">("friends");
  const [includeNsfw, setIncludeNsfw] = useState(initialAllowNsfw);
  const [stories, setStories] = useState<Story[]>([]);
  const [message, setMessage] = useState("Loading stories...");
  const [isLoading, setIsLoading] = useState(false);
  const [undoStory, setUndoStory] = useState<Story | null>(null);

  const loadStories = useCallback(
    async (excludeIds: string[] = []) => {
      setIsLoading(true);
      setMessage("Loading stories...");

      const query = new URLSearchParams({
        includeNsfw: includeNsfw ? "true" : "false",
        source,
      });

      if (excludeIds.length > 0) {
        query.set("exclude", excludeIds.join(","));
      }

      try {
        const response = await fetch(`/api/explore/stories?${query.toString()}`);
        const data = await readApiJson<ExploreStoriesResponse>(response);

        if (!response.ok) {
          setMessage(data?.error?.message ?? "Unable to load stories.");
          return;
        }

        const nextStories = getStories(data);

        setStories(nextStories);
        setUndoStory(null);
        setMessage(
          nextStories.length === 0
            ? "No eligible stories found for these filters."
            : ""
        );
      } catch {
        setMessage("Unable to load stories.");
      } finally {
        setIsLoading(false);
      }
    },
    [includeNsfw, source]
  );

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  const hideStory = async (story: Story) => {
    invariantString(story.id, "story.id");

    setStories((current) => current.filter((item) => item.id !== story.id));
    setUndoStory(story);
    setMessage("Story hidden. Undo");

    try {
      const response = await fetch(`/api/entries/${story.id}/hide`, {
        method: "POST",
      });

      if (!response.ok) {
        setStories((current) => [story, ...current]);
        setUndoStory(null);
        setMessage("Unable to hide story.");
      }
    } catch {
      setStories((current) => [story, ...current]);
      setUndoStory(null);
      setMessage("Unable to hide story.");
    }
  };

  const undoHide = async () => {
    if (!undoStory) {
      return;
    }

    const story = undoStory;
    setUndoStory(null);

    try {
      const response = await fetch(`/api/entries/${story.id}/hide`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setMessage("Unable to restore story.");
        return;
      }

      setStories((current) =>
        current.some((item) => item.id === story.id) ? current : [story, ...current]
      );
      setMessage("Story restored.");
    } catch {
      setMessage("Unable to restore story.");
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-white/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="flex rounded-full bg-[var(--paper-soft)] p-1">
          <SegmentedButton
            active={source === "friends"}
            onClick={() => setSource("friends")}
          >
            Friends
          </SegmentedButton>
          <SegmentedButton
            active={source === "random"}
            onClick={() => setSource("random")}
          >
            Random
          </SegmentedButton>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold text-[var(--sage-dark)]">
            <input
              checked={includeNsfw}
              className="size-4 accent-[var(--sage)]"
              onChange={(event) => setIncludeNsfw(event.target.checked)}
              type="checkbox"
            />
            NSFW
          </label>
          <button
            className="app-button-primary px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
            disabled={isLoading}
            onClick={() => loadStories(stories.map((story) => story.id))}
            type="button"
          >
            {isLoading ? "Fetching..." : "Re-roll"}
          </button>
        </div>
      </div>

      {message ? (
        <div
          aria-live="polite"
          className="rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] p-4 text-sm font-semibold text-[var(--muted)]"
        >
          {message === "Story hidden. Undo" && undoStory ? (
            <>
              Story hidden.{" "}
              <button
                className="font-bold text-[var(--sage-dark)] underline underline-offset-2"
                onClick={undoHide}
                type="button"
              >
                Undo
              </button>
            </>
          ) : (
            message
          )}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        {stories.map((story) => (
          <SurfaceCard className="flex min-h-72 flex-col justify-between p-6" key={story.id}>
            <div>
              <div className="flex flex-wrap gap-2">
                {story.visibility !== "PUBLIC" ? (
                  <StreakChip tone="sage">{story.visibility.toLowerCase()}</StreakChip>
                ) : null}
                {story.isNsfw ? <StreakChip>NSFW</StreakChip> : null}
              </div>
              <h3 className="mt-4 break-words font-literary text-2xl font-semibold text-[var(--charcoal)]">
                {story.title}
              </h3>
              <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
                By{" "}
                <Link
                  className="text-[var(--sage-dark)] hover:text-[var(--charcoal)]"
                  href={`/users/${story.author.id}`}
                >
                  {story.author.name}
                </Link>
              </p>
              <p className="mt-4 line-clamp-4 text-sm leading-6 text-[var(--muted)]">
                {story.preview}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-[var(--muted)]">
                <span>{story.wordCount.toLocaleString()} words</span>
                <span>{formatDate(story.publishedAt)}</span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="app-button-primary inline-flex px-5 py-2.5 text-sm"
                href={`/stories/${story.id}`}
              >
                Read
              </Link>
              <button
                className="app-button-secondary px-5 py-2.5 text-sm"
                onClick={() => hideStory(story)}
                type="button"
              >
                Hide
              </button>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </section>
  );
}

function PromptsTab({
  genreOrder,
  promptsByGenre,
}: {
  genreOrder: string[];
  promptsByGenre: Record<string, Prompt[]>;
}) {
  return (
    <div className="space-y-12">
      {genreOrder.map((genre) => {
        const genrePrompts = (promptsByGenre[genre] ?? []).slice(0, 4);

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
              Start with one thoughtful prompt, then shape it into a
              publishable entry in the focused editor.
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
  );
}

export function ExploreTabs({
  genreOrder,
  initialAllowNsfw,
  promptsByGenre,
}: ExploreTabsProps) {
  const [tab, setTab] = useState<"stories" | "prompts">("stories");

  return (
    <div className="space-y-6">
      <div className="flex w-fit rounded-full bg-[var(--paper-soft)] p-1">
        <SegmentedButton active={tab === "stories"} onClick={() => setTab("stories")}>
          Stories
        </SegmentedButton>
        <SegmentedButton active={tab === "prompts"} onClick={() => setTab("prompts")}>
          Prompts
        </SegmentedButton>
      </div>

      {tab === "stories" ? (
        <StoriesTab initialAllowNsfw={initialAllowNsfw} />
      ) : (
        <PromptsTab genreOrder={genreOrder} promptsByGenre={promptsByGenre} />
      )}
    </div>
  );
}
