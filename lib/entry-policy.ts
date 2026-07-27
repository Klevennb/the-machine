export const STORY_GENRES = [
  "Fantasy",
  "Science Fiction",
  "Romance",
  "Mystery",
  "Horror",
  "Literary",
  "Poetry",
  "Memoir",
  "Thriller",
  "Historical",
  "Comedy",
  "Nonfiction",
  "Other",
] as const;

export type StoryGenre = (typeof STORY_GENRES)[number];

const STANDARD_STORY_GENRES = new Set<string>(STORY_GENRES.slice(0, -1));

export function resolveInitialStoryGenre(promptGenre: string): {
  storyGenre: StoryGenre;
  customStoryGenre: string | null;
} {
  const normalized = promptGenre.trim();

  if (STANDARD_STORY_GENRES.has(normalized)) {
    return { storyGenre: normalized as StoryGenre, customStoryGenre: null };
  }

  return {
    storyGenre: "Other",
    customStoryGenre: normalized.slice(0, 48) || null,
  };
}

export function normalizeStoryGenre(
  storyGenre: unknown,
  customStoryGenre: unknown
): { storyGenre: StoryGenre; customStoryGenre: string | null } | null {
  if (
    typeof storyGenre !== "string" ||
    !STORY_GENRES.includes(storyGenre as StoryGenre)
  ) {
    return null;
  }

  const normalizedCustom =
    typeof customStoryGenre === "string"
      ? customStoryGenre.trim().slice(0, 48) || null
      : null;

  return {
    storyGenre: storyGenre as StoryGenre,
    customStoryGenre:
      storyGenre === "Other" ? normalizedCustom : null,
  };
}

export function getContestSubmissionRequirements({
  title,
  storyGenre,
  wordCount,
}: {
  title: string;
  storyGenre: StoryGenre | null;
  wordCount: number;
}) {
  const hasTitle = Boolean(title.trim());
  const hasStoryGenre = storyGenre !== null;
  const hasMinimumWords = wordCount >= 100;

  return {
    hasTitle,
    hasStoryGenre,
    hasMinimumWords,
    isReady: hasTitle && hasStoryGenre && hasMinimumWords,
  };
}

export function getContestDraftDefaults({
  authorDisplayName,
  promptGenre,
  promptTitle,
}: {
  authorDisplayName: string;
  promptGenre: string;
  promptTitle: string;
}) {
  return {
    title: `${promptTitle} — by ${authorDisplayName}`,
    ...resolveInitialStoryGenre(promptGenre),
  };
}
