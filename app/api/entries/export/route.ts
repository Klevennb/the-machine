import JSZip from "jszip";
import { invariant, invariantString } from "@/lib/invariant";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportPayload = {
  entryIds?: unknown;
  exportAll?: unknown;
};

function sanitizePathPart(value: string) {
  invariantString(value, "value");

  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return sanitized || "untitled-entry";
}

function formatDateForFilename(value: Date | null) {
  invariant(value === null || value instanceof Date, "value must be a Date or null.");

  return (value ?? new Date()).toISOString().slice(0, 10);
}

function escapeMarkdown(value: string) {
  invariantString(value, "value");

  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

function section(title: string, body: string | null | undefined) {
  invariantString(title, "title");
  invariant(body === undefined || body === null || typeof body === "string", "body must be a string when provided.");

  const normalized = body?.trim();

  if (!normalized) {
    return "";
  }

  return `\n\n## ${title}\n\n${normalized}`;
}

function toMarkdown(entry: ExportEntry) {
  invariant(Boolean(entry), "entry is required.");

  const title = entry.title?.trim() || "Untitled Entry";
  const metadata = [
    ["Status", entry.status],
    ["Visibility", entry.visibility],
    ["Words", entry.wordCount.toLocaleString()],
    ["Created", entry.createdAt.toISOString()],
    ["Updated", entry.updatedAt.toISOString()],
    ["Made public", entry.publishedAt?.toISOString() ?? "Not made public"],
    ["Prompt", entry.prompt ? `${entry.prompt.title} (${entry.prompt.genre})` : null],
    ["Series", entry.series?.title ?? null],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `| ${label} | ${escapeMarkdown(String(value))} |`)
    .join("\n");
  const body = entry.plainText?.trim() || "_No body text saved._";

  return `# ${title}

| Field | Value |
| --- | --- |
${metadata}${section("Prompt", entry.prompt?.body)}${section(
    "Private Author Note",
    entry.privateAuthorNote
  )}${section("Public Author Note", entry.publicAuthorNote)}

## Body

${body}
`;
}

type ExportEntry = Awaited<ReturnType<typeof getEntriesForExport>>[number];

async function getEntriesForExport({
  entryIds,
  exportAll,
  userId,
}: {
  entryIds: string[];
  exportAll: boolean;
  userId: string;
}) {
  invariant(Array.isArray(entryIds), "entryIds must be an array.");
  invariant(typeof exportAll === "boolean", "exportAll must be boolean.");
  invariantString(userId, "userId");

  return prisma.entry.findMany({
    where: {
      authorId: userId,
      ...(exportAll
        ? {}
        : {
            id: {
              in: entryIds,
            },
          }),
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      seriesId: true,
      promptId: true,
      title: true,
      slug: true,
      summary: true,
      plainText: true,
      content: true,
      wordCount: true,
      privateAuthorNote: true,
      publicAuthorNote: true,
      visibility: true,
      commentPolicy: true,
      status: true,
      isStandalone: true,
      firstSubmittedAt: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      series: {
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          visibility: true,
          createdAt: true,
          updatedAt: true,
        },
      },
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
  });
}

export async function POST(request: Request) {
  invariant(request instanceof Request, "request must be a Request.");

  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ExportPayload;
  const exportAll = body.exportAll === true;
  const entryIds = Array.isArray(body.entryIds)
    ? Array.from(
        new Set(
          body.entryIds.filter(
            (entryId): entryId is string =>
              typeof entryId === "string" && entryId.trim().length > 0
          )
        )
      )
    : [];

  if (!exportAll && entryIds.length === 0) {
    return Response.json(
      { error: "Choose entries to export or export all entries." },
      { status: 400 }
    );
  }

  const entries = await getEntriesForExport({
    entryIds,
    exportAll,
    userId,
  });
  const zip = new JSZip();
  const exportedAt = new Date();
  const exportDate = exportedAt.toISOString().slice(0, 10);

  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        app: "WriteAway",
        exportedAt: exportedAt.toISOString(),
        exportType: exportAll ? "all" : "selected",
        requestedEntryCount: exportAll ? null : entryIds.length,
        entryCount: entries.length,
        entries: entries.map((entry) => ({
          id: entry.id,
          title: entry.title,
          status: entry.status,
          visibility: entry.visibility,
          wordCount: entry.wordCount,
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
          publishedAt: entry.publishedAt?.toISOString() ?? null,
        })),
      },
      null,
      2
    )
  );

  for (const entry of entries) {
    const title = entry.title?.trim() || "Untitled Entry";
    const folderName = `${formatDateForFilename(entry.createdAt)}-${sanitizePathPart(
      title
    )}-${entry.id}`;
    const folder = zip.folder(folderName);

    folder?.file("entry.md", toMarkdown(entry));
    folder?.file(
      "entry.json",
      JSON.stringify(
        {
          ...entry,
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
          firstSubmittedAt: entry.firstSubmittedAt?.toISOString() ?? null,
          publishedAt: entry.publishedAt?.toISOString() ?? null,
          series: entry.series
            ? {
                ...entry.series,
                createdAt: entry.series.createdAt.toISOString(),
                updatedAt: entry.series.updatedAt.toISOString(),
              }
            : null,
        },
        null,
        2
      )
    );
  }

  const archive = await zip.generateAsync({
    compression: "DEFLATE",
    type: "arraybuffer",
  });

  return new Response(archive, {
    headers: {
      "Content-Disposition": `attachment; filename="writeaway-library-export-${exportDate}.zip"`,
      "Content-Type": "application/zip",
    },
  });
}
