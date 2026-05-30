"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPopularityScore } from "@/lib/community";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

async function requireSignedInUserForPromptAction() {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  return userId;
}

async function refreshPromptPopularity(promptId: string) {
  const prompt = await prisma.writingPrompt.findUnique({
    where: { id: promptId },
    select: { voteCount: true, usageCount: true },
  });

  if (!prompt) {
    return;
  }

  await prisma.writingPrompt.update({
    where: { id: promptId },
    data: {
      popularityScore: getPopularityScore(prompt.voteCount, prompt.usageCount),
    },
  });
}

export async function voteForPrompt(formData: FormData) {
  const userId = await requireSignedInUserForPromptAction();
  const promptId = formData.get("promptId");

  if (typeof promptId !== "string" || !promptId) {
    return;
  }

  const prompt = await prisma.writingPrompt.findFirst({
    where: { id: promptId, status: "APPROVED" },
    select: { id: true },
  });

  if (!prompt) {
    return;
  }

  try {
    await prisma.$transaction([
      prisma.promptVote.create({
        data: {
          promptId,
          userId,
        },
      }),
      prisma.writingPrompt.update({
        where: { id: promptId },
        data: {
          voteCount: {
            increment: 1,
          },
        },
      }),
    ]);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return;
    }

    throw error;
  }

  await refreshPromptPopularity(promptId);
  revalidatePath("/prompts");
}

export async function usePrompt(formData: FormData) {
  const userId = await requireSignedInUserForPromptAction();
  const promptId = formData.get("promptId");

  if (typeof promptId !== "string" || !promptId) {
    redirect("/prompts");
  }

  const prompt = await prisma.writingPrompt.findFirst({
    where: { id: promptId, status: "APPROVED" },
    select: { id: true },
  });

  if (!prompt) {
    redirect("/prompts");
  }

  await prisma.$transaction([
    prisma.promptUsageEvent.create({
      data: {
        promptId,
        userId,
        eventType: "USE",
      },
    }),
    prisma.writingPrompt.update({
      where: { id: promptId },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    }),
  ]);

  await refreshPromptPopularity(promptId);
  revalidatePath("/prompts");
  redirect("/write");
}
