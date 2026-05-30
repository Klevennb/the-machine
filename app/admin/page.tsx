import Image from "next/image";
import { redirect } from "next/navigation";
import { moderateFeedback, moderateWritingPrompt } from "@/app/admin/actions";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { SurfaceCard } from "@/app/components/app-ui";
import { isCurrentUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function AdminActionButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="app-button-primary px-4 py-2 text-sm"
        name="status"
        type="submit"
        value="APPROVED"
      >
        Approve
      </button>
      <button
        className="app-button-secondary px-4 py-2 text-sm"
        name="status"
        type="submit"
        value="REJECTED"
      >
        Reject
      </button>
      <button
        className="app-button-secondary px-4 py-2 text-sm"
        name="status"
        type="submit"
        value="ARCHIVED"
      >
        Archive
      </button>
    </div>
  );
}

export default async function AdminPage() {
  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    redirect("/");
  }

  const [pendingPrompts, feedbackSubmissions] = await Promise.all([
    prisma.writingPrompt.findMany({
      where: {
        status: "PENDING",
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        title: true,
        body: true,
        genre: true,
        createdAt: true,
        author: {
          select: {
            name: true,
            username: true,
            email: true,
          },
        },
      },
    }),
    prisma.feedbackSubmission.findMany({
      where: {
        status: "PENDING",
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        category: true,
        subject: true,
        body: true,
        attachmentUrl: true,
        attachmentName: true,
        attachmentMimeType: true,
        attachmentSizeBytes: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            username: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return (
    <ProtectedPageShell
      title="Admin"
      description="Review community prompts and private feedback submissions."
      panelClassName="max-w-6xl"
      showHomeLink
    >
      <div className="grid gap-8 xl:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-literary text-3xl font-semibold text-[var(--charcoal)]">
              Pending Prompts
            </h2>
            <span className="text-sm font-bold text-[var(--muted)]">
              {pendingPrompts.length}
            </span>
          </div>
          <div className="space-y-4">
            {pendingPrompts.length === 0 ? (
              <SurfaceCard className="p-6 text-sm text-[var(--muted)]">
                No prompts are waiting for review.
              </SurfaceCard>
            ) : (
              pendingPrompts.map((prompt) => (
                <SurfaceCard className="p-5" key={prompt.id}>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                    <span>{prompt.genre}</span>
                    <span>{formatDate(prompt.createdAt)}</span>
                  </div>
                  <h3 className="mt-3 font-literary text-2xl font-semibold text-[var(--charcoal)]">
                    {prompt.title}
                  </h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--charcoal)]/80">
                    {prompt.body}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-[var(--muted)]">
                    By{" "}
                    {prompt.author.username ||
                      prompt.author.name ||
                      prompt.author.email ||
                      "Unknown writer"}
                  </p>
                  <form action={moderateWritingPrompt} className="mt-5 space-y-3">
                    <input name="promptId" type="hidden" value={prompt.id} />
                    <textarea
                      className="app-field min-h-24 w-full px-4 py-3 text-sm"
                      name="adminNotes"
                      placeholder="Admin notes"
                    />
                    <AdminActionButtons />
                  </form>
                </SurfaceCard>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-literary text-3xl font-semibold text-[var(--charcoal)]">
              Feedback
            </h2>
            <span className="text-sm font-bold text-[var(--muted)]">
              {feedbackSubmissions.length}
            </span>
          </div>
          <div className="space-y-4">
            {feedbackSubmissions.length === 0 ? (
              <SurfaceCard className="p-6 text-sm text-[var(--muted)]">
                No feedback is waiting for review.
              </SurfaceCard>
            ) : (
              feedbackSubmissions.map((feedback) => (
                <SurfaceCard className="p-5" key={feedback.id}>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                    <span>{feedback.category.replaceAll("_", " ")}</span>
                    <span>{formatDate(feedback.createdAt)}</span>
                  </div>
                  <h3 className="mt-3 font-literary text-2xl font-semibold text-[var(--charcoal)]">
                    {feedback.subject || "No subject"}
                  </h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--charcoal)]/80">
                    {feedback.body}
                  </p>
                  {feedback.attachmentUrl ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-white/70">
                      <a
                        className="block"
                        href={feedback.attachmentUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span className="relative block h-80 w-full">
                          <Image
                            alt={feedback.attachmentName || "Feedback attachment"}
                            className="object-contain"
                            fill
                            src={feedback.attachmentUrl}
                          />
                        </span>
                      </a>
                      <div className="border-t border-[var(--line)] px-4 py-3 text-xs font-semibold text-[var(--muted)]">
                        {feedback.attachmentName || "Attached image"}
                        {feedback.attachmentSizeBytes ? (
                          <span>
                            {" "}
                            ({Math.round(feedback.attachmentSizeBytes / 1024)} KB)
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <p className="mt-3 text-sm font-semibold text-[var(--muted)]">
                    By{" "}
                    {feedback.user.username ||
                      feedback.user.name ||
                      feedback.user.email ||
                      "Unknown writer"}
                  </p>
                  <form action={moderateFeedback} className="mt-5 space-y-3">
                    <input name="feedbackId" type="hidden" value={feedback.id} />
                    <textarea
                      className="app-field min-h-24 w-full px-4 py-3 text-sm"
                      name="adminNotes"
                      placeholder="Admin notes"
                    />
                    <AdminActionButtons />
                  </form>
                </SurfaceCard>
              ))
            )}
          </div>
        </section>
      </div>
    </ProtectedPageShell>
  );
}
