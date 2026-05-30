export const MAX_FEEDBACK_SUBJECT_LENGTH = 120;
export const MAX_FEEDBACK_BODY_LENGTH = 4000;
export const MAX_PROMPT_TITLE_LENGTH = 120;
export const MAX_PROMPT_GENRE_LENGTH = 48;
export const MAX_PROMPT_BODY_LENGTH = 5000;

export function normalizeGenre(genre: string) {
  return genre.trim().replace(/\s+/g, " ").toLowerCase();
}

export function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function cleanLongText(
  value: FormDataEntryValue | null,
  maxLength: number
) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

export function getPopularityScore(voteCount: number, usageCount: number) {
  return voteCount * 3 + usageCount;
}
