"use server";

import { revalidatePath } from "next/cache";
import { SubmissionStatus } from "@prisma/client";
import { cleanLongText } from "@/lib/community";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const moderationStatuses = new Set<SubmissionStatus>([
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
]);

function isModerationStatus(status: string): status is SubmissionStatus {
  return moderationStatuses.has(status as SubmissionStatus);
}

export async function moderateWritingPrompt(formData: FormData) {
  await requireAdmin();

  const promptId = formData.get("promptId");
  const status = formData.get("status");
  const adminNotes = cleanLongText(formData.get("adminNotes"), 2000);

  if (
    typeof promptId !== "string" ||
    typeof status !== "string" ||
    !isModerationStatus(status)
  ) {
    return;
  }

  await prisma.writingPrompt.update({
    where: { id: promptId },
    data: {
      status,
      adminNotes: adminNotes || null,
      approvedAt: status === "APPROVED" ? new Date() : null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/prompts");
}

export async function moderateFeedback(formData: FormData) {
  await requireAdmin();

  const feedbackId = formData.get("feedbackId");
  const status = formData.get("status");
  const adminNotes = cleanLongText(formData.get("adminNotes"), 2000);

  if (
    typeof feedbackId !== "string" ||
    typeof status !== "string" ||
    !isModerationStatus(status)
  ) {
    return;
  }

  await prisma.feedbackSubmission.update({
    where: { id: feedbackId },
    data: {
      status,
      adminNotes: adminNotes || null,
    },
  });

  revalidatePath("/admin");
}
