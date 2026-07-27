import { apiError, apiSuccess, createRequestId } from "@/lib/api-response";
import {
  parseContestDraftInput,
  submitContestDraft,
} from "@/lib/contest-writing";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const userId = await getCurrentUserId();
  if (!userId) return apiError({ code: "UNAUTHORIZED", message: "Log in to submit to the contest.", requestId, status: 401 });
  try {
    const parsed = parseContestDraftInput(await request.json());
    if ("error" in parsed) return apiError({ code: "INVALID_CONTEST_SUBMISSION", message: parsed.error, requestId, status: 400 });
    const result = await submitContestDraft(prisma, { input: parsed.input, userId });
    return apiSuccess({ data: result, requestId, status: 201 });
  } catch (error) {
    return apiError({ code: "CONTEST_SUBMISSION_REJECTED", message: error instanceof Error ? error.message : "Unable to submit contest entry.", requestId, status: 409 });
  }
}
