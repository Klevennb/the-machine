import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { LibraryBrowser } from "@/app/components/library-browser";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

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
      status: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
    },
  });

  return (
    <ProtectedPageShell
      title="Library"
      description="Browse everything you have written, search across entries, read the selected piece, and manage whether it is public or private."
      panelClassName="max-w-7xl"
      showHomeLink
    >
      <LibraryBrowser
        initialEntries={entries.map((entry) => ({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
          publishedAt: entry.publishedAt?.toISOString() ?? null,
        }))}
      />
    </ProtectedPageShell>
  );
}
