"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { FeedbackCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  cleanLongText,
  cleanText,
  MAX_FEEDBACK_BODY_LENGTH,
  MAX_FEEDBACK_SUBJECT_LENGTH,
} from "@/lib/community";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/session";

type FeedbackState = {
  error?: string;
  success?: string;
};

const feedbackCategories = new Set(Object.values(FeedbackCategory));
const maxImageSizeBytes = 5 * 1024 * 1024;
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/gif", "gif"],
  ["image/webp", "webp"],
]);

async function saveFeedbackImage(file: File) {
  if (file.size <= 0) {
    return null;
  }

  if (file.size > maxImageSizeBytes) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const extension = allowedImageTypes.get(file.type);

  if (!extension) {
    throw new Error("Upload a JPG, PNG, GIF, or WebP image.");
  }

  const uploadDirectory = path.join(
    process.cwd(),
    "public",
    "feedback-uploads"
  );
  const fileName = `${randomUUID()}.${extension}`;
  const filePath = path.join(uploadDirectory, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(filePath, bytes);

  return {
    attachmentMimeType: file.type,
    attachmentName: file.name.trim() || "feedback-image",
    attachmentSizeBytes: file.size,
    attachmentUrl: `/feedback-uploads/${fileName}`,
  };
}

export async function submitFeedback(
  _state: FeedbackState,
  formData: FormData
): Promise<FeedbackState> {
  const userId = await requireCurrentUserId();
  const rawCategory = formData.get("category");
  const category =
    typeof rawCategory === "string" ? rawCategory.trim().toUpperCase() : "";
  const subject = cleanText(
    formData.get("subject"),
    MAX_FEEDBACK_SUBJECT_LENGTH
  );
  const body = cleanLongText(formData.get("body"), MAX_FEEDBACK_BODY_LENGTH);
  const attachment = formData.get("image");

  if (!feedbackCategories.has(category as FeedbackCategory)) {
    return { error: "Choose a feedback category." };
  }

  if (!body) {
    return { error: "Feedback needs a body." };
  }

  try {
    const savedImage =
      attachment instanceof File ? await saveFeedbackImage(attachment) : null;

    await prisma.feedbackSubmission.create({
      data: {
        userId,
        category: category as FeedbackCategory,
        subject: subject || null,
        body,
        ...(savedImage ?? {}),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }

    throw error;
  }

  revalidatePath("/admin");
  return { success: "Feedback sent. Thanks for helping improve WriteNow." };
}
