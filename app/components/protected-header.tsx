import { getServerSession } from "next-auth";
import Link from "next/link";
import { SignOutButton } from "@/app/components/sign-out-button";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function ProtectedHeader() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const pendingRequestCount = userId
    ? await prisma.friendship.count({
        where: {
          addresseeId: userId,
          status: "PENDING",
          ignoredAt: null,
        },
      })
    : 0;

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link
          className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-700"
          href="/"
        >
          WriteNow
        </Link>
        <div className="flex items-center gap-3">
          <Link
            className="relative rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            href="/search"
          >
            Requests
            {pendingRequestCount > 0 ? (
              <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-slate-950">
                {pendingRequestCount}
              </span>
            ) : null}
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
