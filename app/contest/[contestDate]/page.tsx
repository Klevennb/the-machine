import Link from "next/link";
import { notFound } from "next/navigation";
import { SurfaceCard } from "@/app/components/app-ui";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { disqualifyContestEntry, updateContestPreferences, voteForContestEntry, withdrawContestEntry } from "@/app/contest/actions";
import { isCurrentUserAdmin } from "@/lib/admin";
import { contestDateToDbDate, finalizeContest, getChicagoContestDate, getOrCreateContest } from "@/lib/daily-contest";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DatedContestPage({ params, searchParams }: { params: Promise<{ contestDate: string }>; searchParams: Promise<{ error?: string }> }) {
  const { contestDate } = await params;
  const userId = await getCurrentUserId();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(contestDate)) notFound();
  let contest = contestDate === getChicagoContestDate() ? await getOrCreateContest(prisma) : await prisma.dailyContest.findUnique({ where: { contestDate: contestDateToDbDate(contestDate) } });
  if (!contest) {
    return <ProtectedPageShell title="Daily Prompt Contest" description="No unused prompts available. An administrator needs to add prompts to the queue."><SurfaceCard className="p-6">No contest is available for this date.</SurfaceCard></ProtectedPageShell>;
  }
  await finalizeContest(prisma, contest.id);
  contest = (await prisma.dailyContest.findUnique({ where: { id: contest.id } }))!;
  const preference = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { showNsfwContestEntries: true } }) : null;
  const isAdmin = userId ? await isCurrentUserAdmin() : false;
  const entries = await prisma.contestEntry.findMany({
    where: { contestId: contest.id, status: "ACTIVE", entry: { isNsfw: preference?.showNsfwContestEntries ? undefined : false } },
    orderBy: [{ voteCount: "desc" }, { submittedAt: "asc" }, { id: "asc" }],
    include: { entry: true, author: { select: { name: true, username: true } }, votes: { where: { userId: userId ?? "" }, select: { id: true } } },
  });
  const now = new Date();
  const submissionsOpen = now >= contest.submissionsOpenAt && now < contest.submissionsCloseAt;
  const votingOpen = now < contest.votingCloseAt;
  const { error } = await searchParams;

  return <ProtectedPageShell title={`${contest.promptTitle} — Daily Contest`} description={`${contestDate} · ${submissionsOpen ? "Submissions open" : votingOpen ? "Voting open" : "Final"}`} panelClassName="max-w-5xl">
    <div className="space-y-6">
      {error ? <p className="rounded-2xl bg-[var(--sunset-soft)] p-4 font-semibold text-[var(--sunset)]">{error}</p> : null}
      <SurfaceCard className="p-6"><p className="text-xs font-bold uppercase tracking-widest text-[var(--sage-dark)]">{contest.promptGenre}</p><p className="mt-3 font-literary text-2xl leading-9">{contest.promptBody}</p>
        {submissionsOpen && userId ? <Link className="app-button-primary mt-5 inline-flex px-5 py-2.5" href={`/write?contestId=${contest.id}`}>Write from this prompt</Link> : null}
      </SurfaceCard>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold">You get one vote for this contest.</p>
        {userId ? <form action={updateContestPreferences}><label className="flex items-center gap-2 text-sm font-semibold"><input name="showNsfw" type="checkbox" defaultChecked={preference?.showNsfwContestEntries} /> Show NSFW entries</label><button className="app-button-secondary ml-3 px-3 py-1.5 text-sm">Save</button></form> : null}
      </div>
      {entries.map((item) => <SurfaceCard className="p-6" key={item.id}><div className="flex flex-wrap justify-between gap-3"><div>{contest.winnerEntryId === item.id ? <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--sunset)]">Contest winner</p> : null}<Link className="font-literary text-2xl font-bold" href={`/stories/${item.entryId}`}>{item.entry.title || "Untitled Entry"}</Link><p className="mt-1 text-sm text-[var(--muted)]">by {item.author.name || item.author.username || "Writer"} · {item.entry.wordCount} words</p></div><strong>{item.voteCount} vote{item.voteCount === 1 ? "" : "s"}</strong></div><p className="mt-4 line-clamp-4 whitespace-pre-wrap leading-7">{item.entry.summary || item.entry.plainText}</p>
        <div className="mt-4 flex gap-3">{userId && votingOpen && item.authorId !== userId ? <form action={voteForContestEntry}><input type="hidden" name="contestEntryId" value={item.id}/><button className="app-button-primary px-4 py-2">{item.votes.length ? "Your vote" : "Vote for this entry"}</button></form> : null}{userId === item.authorId && submissionsOpen ? <form action={withdrawContestEntry}><input type="hidden" name="contestEntryId" value={item.id}/><button className="app-button-secondary px-4 py-2">Withdraw</button></form> : null}</div>
      </SurfaceCard>)}
      {isAdmin ? <details className="rounded-2xl border border-[var(--line)] bg-white/70 p-4"><summary className="cursor-pointer font-bold">Admin moderation</summary>{entries.map((item) => <form action={disqualifyContestEntry} className="mt-3 flex flex-wrap gap-2" key={item.id}><input type="hidden" name="contestEntryId" value={item.id}/><input className="app-field flex-1 px-3 py-2" name="adminNotes" placeholder={`Reason for disqualifying ${item.entry.title || "entry"}`}/><button className="app-button-secondary px-3 py-2">Disqualify</button></form>)}</details> : null}
      {entries.length === 0 ? <SurfaceCard className="p-6 text-[var(--muted)]">No visible entries yet.</SurfaceCard> : null}
    </div>
  </ProtectedPageShell>;
}
