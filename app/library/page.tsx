import { redirect } from "next/navigation";
import { LibraryBrowser } from "@/app/components/library-browser";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export default async function LibraryPage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  const entries = await prisma.entry.findMany({
    where: {
      authorId: userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      title: true,
      summary: true,
      plainText: true,
      wordCount: true,
      privateAuthorNote: true,
      publicAuthorNote: true,
      visibility: true,
      isNsfw: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      contestEntry: { select: { id: true, status: true, contest: { select: { contestDate: true } } } },
    },
  });

  return (
    <ProtectedPageShell
      title="Personal Library"
      description="Return to previous thoughts and continue where your mind left off."
      panelClassName="max-w-7xl"
      showHomeLink
    >
      <LibraryBrowser
        initialEntries={entries.map((entry) => ({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
          publishedAt: entry.publishedAt?.toISOString() ?? null,
          contestEntry: entry.contestEntry ? { ...entry.contestEntry, contestDate: entry.contestEntry.contest.contestDate.toISOString().slice(0, 10) } : null,
        }))}
      />
    </ProtectedPageShell>
  );
}
