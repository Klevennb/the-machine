import { apiError, apiSuccess, createRequestId } from "@/lib/api-response";
import {
  convertContestDraft,
  parseContestDraftInput,
} from "@/lib/contest-writing";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Log in to continue this draft.",
      requestId,
      status: 401,
    });
  }

  try {
    const parsed = parseContestDraftInput(await request.json());
    if ("error" in parsed) {
      return apiError({
        code: "INVALID_CONTEST_DRAFT",
        message: parsed.error,
        requestId,
        status: 400,
      });
    }
    const result = await convertContestDraft(prisma, {
      input: parsed.input,
      userId,
    });
    return apiSuccess({ data: result, requestId });
  } catch (error) {
    return apiError({
      code: "CONTEST_CONVERSION_REJECTED",
      message:
        error instanceof Error
          ? error.message
          : "Unable to continue as normal writing.",
      requestId,
      status: 409,
    });
  }
}
