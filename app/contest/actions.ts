"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/admin";
import { moveContestVote, submitContestEntry } from "@/lib/daily-contest";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/session";

function value(formData: FormData, name: string) {
  const result = formData.get(name);
  if (typeof result !== "string" || !result) throw new Error(`${name} is required.`);
  return result;
}

export async function submitToContest(formData: FormData) {
  const userId = await requireCurrentUserId();
  const contestId = value(formData, "contestId");
  try {
    await submitContestEntry(prisma, { contestId, entryId: value(formData, "entryId"), userId });
  } catch (error) {
    redirect(`/contest?error=${encodeURIComponent(error instanceof Error ? error.message : "Unable to submit entry.")}`);
  }
  revalidatePath("/contest");
  redirect("/contest");
}

export async function voteForContestEntry(formData: FormData) {
  const userId = await requireCurrentUserId();
  try {
    await moveContestVote(prisma, { contestEntryId: value(formData, "contestEntryId"), userId });
  } catch (error) {
    redirect(`/contest?error=${encodeURIComponent(error instanceof Error ? error.message : "Unable to vote.")}`);
  }
  revalidatePath("/contest");
}

export async function withdrawContestEntry(formData: FormData) {
  const userId = await requireCurrentUserId();
  const contestEntryId = value(formData, "contestEntryId");
  await prisma.$transaction(async (tx) => {
    const item = await tx.contestEntry.findFirst({ where: { id: contestEntryId, authorId: userId, status: "ACTIVE", contest: { submissionsCloseAt: { gt: new Date() } } } });
    if (!item) throw new Error("This contest entry can no longer be withdrawn.");
    await tx.contestVote.deleteMany({ where: { contestEntryId } });
    await tx.contestEntry.update({ where: { id: contestEntryId }, data: { status: "WITHDRAWN", withdrawnAt: new Date(), voteCount: 0 } });
  });
  revalidatePath("/contest");
}

export async function updateContestPreferences(formData: FormData) {
  const userId = await requireCurrentUserId();
  await prisma.user.update({ where: { id: userId }, data: { showNsfwContestEntries: formData.get("showNsfw") === "on" } });
  revalidatePath("/contest");
}

export async function toggleDailyContestCard(formData: FormData) {
  const userId = await requireCurrentUserId();
  await prisma.user.update({ where: { id: userId }, data: { hideDailyContestCard: formData.get("hidden") === "true" } });
  revalidatePath("/");
}

export async function disqualifyContestEntry(formData: FormData) {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
  const adminId = await requireCurrentUserId();
  const contestEntryId = value(formData, "contestEntryId");
  await prisma.$transaction(async (tx) => {
    await tx.contestVote.deleteMany({ where: { contestEntryId } });
    await tx.contestEntry.update({ where: { id: contestEntryId }, data: { status: "DISQUALIFIED", disqualifiedAt: new Date(), disqualifiedById: adminId, adminNotes: String(formData.get("adminNotes") ?? ""), voteCount: 0 } });
  });
  revalidatePath("/contest");
}
