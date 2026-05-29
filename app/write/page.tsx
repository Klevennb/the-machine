import { redirect } from "next/navigation";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { WriteEditor } from "@/app/components/write-editor";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { getTodayWritingProgress } from "@/lib/writing-progress";

type WritePageProps = {
  searchParams: Promise<{ entryId?: string | string[] }>;
};

export default async function WritePage({ searchParams }: WritePageProps) {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  const params = await searchParams;
  const requestedEntryId = Array.isArray(params.entryId)
    ? params.entryId[0]
    : params.entryId;

  const [draft, todayProgress] = await Promise.all([
    requestedEntryId
      ? prisma.entry.findFirst({
          where: {
            id: requestedEntryId,
            authorId: userId,
          },
          select: {
            id: true,
            title: true,
            plainText: true,
            content: true,
            wordCount: true,
            privateAuthorNote: true,
            publicAuthorNote: true,
            promptId: true,
            prompt: {
              select: {
                id: true,
                title: true,
                body: true,
                genre: true,
                tags: true,
              },
            },
          },
        })
      : null,
    getTodayWritingProgress(prisma, userId),
  ]);

  return (
    <ProtectedPageShell
      title="Write"
      description="A focused writing surface with prompts, notes, word count, and draft saving close at hand."
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
                prompt: draft.prompt,
              }
            : null
        }
        initialProgress={todayProgress}
        showPromptPicker={!draft}
      />
    </ProtectedPageShell>
  );
}
