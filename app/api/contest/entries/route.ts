import { apiError, apiSuccess, createRequestId } from "@/lib/api-response";
import { submitContestEntry } from "@/lib/daily-contest";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const userId = await getCurrentUserId();
  if (!userId) return apiError({ code: "UNAUTHORIZED", message: "Log in to submit to the contest.", requestId, status: 401 });
  try {
    const body = await request.json() as { contestId?: unknown; entryId?: unknown };
    if (typeof body.contestId !== "string" || typeof body.entryId !== "string") return apiError({ code: "INVALID_CONTEST_SUBMISSION", message: "Contest and entry are required.", requestId, status: 400 });
    const contestEntry = await submitContestEntry(prisma, { contestId: body.contestId, entryId: body.entryId, userId });
    return apiSuccess({ data: { contestEntry }, requestId, status: 201 });
  } catch (error) {
    return apiError({ code: "CONTEST_SUBMISSION_REJECTED", message: error instanceof Error ? error.message : "Unable to submit contest entry.", requestId, status: 409 });
  }
}
