import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENRES = [
  "Fantasy",
  "Science Fiction",
  "Romance",
  "Mystery",
  "Horror",
  "Literary",
  "Poetry",
  "Memoir",
  "Thriller",
  "Historical",
  "Comedy",
  "Nonfiction",
] as const;

function getSessionUserId(session: unknown) {
  return (session as { user?: { id?: string } } | null)?.user?.id ?? null;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedGenre = searchParams.get("genre")?.trim() ?? "";
  const excludeIds = searchParams
    .get("exclude")
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!GENRES.includes(requestedGenre as (typeof GENRES)[number])) {
    return Response.json({ error: "Choose a valid genre." }, { status: 400 });
  }

  const where = {
    genre: requestedGenre,
    ...(excludeIds?.length
      ? {
          id: {
            notIn: excludeIds,
          },
        }
      : {}),
  };

  const promptCount = await prisma.prompt.count({ where });

  if (promptCount === 0) {
    return Response.json(
      { error: "No unused prompts found for this genre." },
      { status: 404 }
    );
  }

  const [prompt] = await prisma.prompt.findMany({
    where,
    orderBy: {
      title: "asc",
    },
    skip: Math.floor(Math.random() * promptCount),
    take: 1,
    select: {
      id: true,
      title: true,
      body: true,
      genre: true,
      tags: true,
    },
  });

  return Response.json({ prompt });
}
