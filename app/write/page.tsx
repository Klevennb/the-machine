import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { WriteEditor } from "@/app/components/write-editor";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type WritePageProps = {
  searchParams: Promise<{ entryId?: string | string[] }>;
};

export default async function WritePage({ searchParams }: WritePageProps) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  if (!userId) {
    redirect("/login");
  }

  const params = await searchParams;
  const requestedEntryId = Array.isArray(params.entryId)
    ? params.entryId[0]
    : params.entryId;

  const draft = requestedEntryId
    ? await prisma.entry.findFirst({
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
        },
      })
    : null;

  return (
    <ProtectedPageShell
      title="Write"
      description="The writing workspace now includes a Lexical editor with the common rich text controls you would expect in a modern drafting surface."
      panelClassName="max-w-5xl"
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
              }
            : null
        }
      />
    </ProtectedPageShell>
  );
}
