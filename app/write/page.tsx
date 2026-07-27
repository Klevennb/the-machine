import { redirect } from "next/navigation";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { WriteEditor } from "@/app/components/write-editor";
import { getOrCreateContestDraft } from "@/lib/contest-writing";
import { invariant } from "@/lib/invariant";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { getTodayWritingProgress } from "@/lib/writing-progress";

type WritePageProps = {
  searchParams: Promise<{
    entryId?: string | string[];
    contestId?: string | string[];
  }>;
};

const entrySelection = {
  id: true,
  title: true,
  plainText: true,
  content: true,
  wordCount: true,
  privateAuthorNote: true,
  publicAuthorNote: true,
  visibility: true,
  isNsfw: true,
  storyGenre: true,
  customStoryGenre: true,
  sourcePromptTitle: true,
  sourcePromptBody: true,
  sourcePromptGenre: true,
  sourceContestId: true,
  prompt: {
    select: {
      id: true,
      title: true,
      body: true,
      genre: true,
      tags: true,
    },
  },
  contestDraft: {
    include: { contest: true },
  },
} as const;

export default async function WritePage({ searchParams }: WritePageProps) {
  invariant(searchParams instanceof Promise, "searchParams must be a Promise.");

  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const params = await searchParams;
  const requestedEntryId = Array.isArray(params.entryId)
    ? params.entryId[0]
    : params.entryId;
  const requestedContestId = Array.isArray(params.contestId)
    ? params.contestId[0]
    : params.contestId;
  const progressPromise = getTodayWritingProgress(prisma, userId);

  let draft = requestedEntryId
    ? await prisma.entry.findFirst({
        where: { id: requestedEntryId, authorId: userId },
        select: entrySelection,
      })
    : null;

  if (requestedContestId) {
    const result = await getOrCreateContestDraft(prisma, {
      contestId: requestedContestId,
      userId,
    });
    if (result.kind === "submitted") {
      redirect(`/stories/${result.entryId}`);
    }
    draft = await prisma.entry.findUnique({
      where: { id: result.draft.entryId },
      select: entrySelection,
    });
  }

  const todayProgress = await progressPromise;
  const contest = draft?.contestDraft?.contest ?? null;
  const sourcePrompt =
    draft?.prompt ??
    (draft?.sourcePromptTitle &&
    draft.sourcePromptBody &&
    draft.sourcePromptGenre &&
    draft.sourceContestId
      ? {
          id: `contest:${draft.sourceContestId}`,
          title: draft.sourcePromptTitle,
          body: draft.sourcePromptBody,
          genre: draft.sourcePromptGenre,
          tags: [],
        }
      : null);

  return (
    <ProtectedPageShell
      title="Write"
      description="A focused writing surface with prompts, notes, word count, and publishing close at hand."
      panelClassName="max-w-7xl"
      showHomeLink
    >
      <WriteEditor
        initialDraft={
          draft
            ? {
                id: draft.id,
                title: draft.title ?? "",
                plainText: draft.plainText ?? "",
                content: draft.content,
                wordCount: draft.wordCount,
                privateAuthorNote: draft.privateAuthorNote ?? "",
                publicAuthorNote: draft.publicAuthorNote ?? "",
                visibility: draft.visibility,
                isNsfw: draft.isNsfw,
                storyGenre: draft.storyGenre,
                customStoryGenre: draft.customStoryGenre,
                prompt: sourcePrompt,
              }
            : null
        }
        initialProgress={todayProgress}
        showPromptPicker={!draft}
        dailyContest={
          contest
            ? {
                id: contest.id,
                contestDate: contest.contestDate.toISOString().slice(0, 10),
                promptTitle: contest.promptTitle,
                promptBody: contest.promptBody,
                promptGenre: contest.promptGenre,
                submissionsCloseAt: contest.submissionsCloseAt.toISOString(),
                submissionsOpen: new Date() < contest.submissionsCloseAt,
              }
            : null
        }
      />
    </ProtectedPageShell>
  );
}
