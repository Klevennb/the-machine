"use server";

import { revalidatePath } from "next/cache";
import {
  cleanLongText,
  cleanText,
  MAX_PROMPT_BODY_LENGTH,
  MAX_PROMPT_GENRE_LENGTH,
  MAX_PROMPT_TITLE_LENGTH,
  normalizeGenre,
} from "@/lib/community";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/session";

type PromptState = {
  error?: string;
  success?: string;
};

export async function submitWritingPrompt(
  _state: PromptState,
  formData: FormData
): Promise<PromptState> {
  const userId = await requireCurrentUserId();
  const title = cleanText(formData.get("title"), MAX_PROMPT_TITLE_LENGTH);
  const genre = cleanText(formData.get("genre"), MAX_PROMPT_GENRE_LENGTH);
  const body = cleanLongText(formData.get("body"), MAX_PROMPT_BODY_LENGTH);
  const normalizedGenre = normalizeGenre(genre);

  if (!title) {
    return { error: "Prompt needs a title." };
  }

  if (!body) {
    return { error: "Prompt needs a body." };
  }

  if (!normalizedGenre) {
    return { error: "Prompt needs a genre." };
  }

  await prisma.writingPrompt.create({
    data: {
      authorId: userId,
      title,
      body,
      genre,
      normalizedGenre,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/prompts");
  return { success: "Prompt submitted for review." };
}
