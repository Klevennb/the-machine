import { apiError, apiSuccess, createRequestId, logApiError } from "@/lib/api-response";
import { invariant } from "@/lib/invariant";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { getExploreStories, type StorySource } from "@/lib/stories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseSource(value: string | null): StorySource {
  if (value === "friends") {
    return "friends";
  }

  return "random";
}

function parseIncludeNsfw(value: string | null) {
  return value === "true";
}

function parseExclude(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function getDisplayName(user: { name: string | null; username: string | null }) {
  return user.name?.trim() || user.username?.trim() || "Unnamed writer";
}

function getPreview(entry: { summary: string | null; plainText: string | null }) {
  const preview = entry.summary?.trim() || entry.plainText?.trim();

  if (!preview) {
    return "No preview available.";
  }

  return preview.replace(/\s+/g, " ").slice(0, 220);
}

export async function GET(request: Request) {
  invariant(request instanceof Request, "request must be a Request.");

  const requestId = createRequestId();
  let userId: string | null = null;

  try {
    userId = await getCurrentUserId();

    if (!userId) {
      return apiError({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
        requestId,
        status: 401,
      });
    }

    const url = new URL(request.url);
    const stories = await getExploreStories({
      db: prisma,
      excludeIds: parseExclude(url.searchParams.get("exclude")),
      includeNsfw: parseIncludeNsfw(url.searchParams.get("includeNsfw")),
      source: parseSource(url.searchParams.get("source")),
      viewerId: userId,
    });

    return apiSuccess({
      data: {
        stories: stories.map((story) => ({
          id: story.id,
          title: story.title?.trim() || "Untitled Entry",
          preview: getPreview(story),
          wordCount: story.wordCount,
          visibility: story.visibility,
          isNsfw: story.isNsfw,
          publishedAt: story.publishedAt?.toISOString() ?? null,
          contestDate: story.contestEntry?.status === "ACTIVE" ? story.contestEntry.contest.contestDate.toISOString().slice(0, 10) : null,
          author: {
            id: story.author.id,
            name: getDisplayName(story.author),
            username: story.author.username,
          },
        })),
      },
      requestId,
    });
  } catch (error) {
    logApiError({
      error,
      metadata: {
        userId,
      },
      requestId,
      route: "GET /api/explore/stories",
    });

    return apiError({
      code: "EXPLORE_STORIES_FAILED",
      message: "Unable to load stories.",
      requestId,
      status: 500,
    });
  }
}
