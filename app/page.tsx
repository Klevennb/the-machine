import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { SignOutButton } from "@/app/components/sign-out-button";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const displayName = session.user.name || session.user.email || "Writer";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.22),_transparent_30%),linear-gradient(160deg,_#fffdf5_0%,_#f8fafc_45%,_#eff6ff_100%)] px-6 py-8 sm:px-10">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:64px_64px] opacity-40" />
      <div className="absolute left-0 top-16 h-56 w-56 rounded-full bg-amber-200/50 blur-3xl" />
      <div className="absolute bottom-8 right-8 h-72 w-72 rounded-full bg-sky-200/45 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4 rounded-full border border-white/70 bg-white/70 px-5 py-3 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
              WriteNow
            </p>
            <p className="text-sm text-slate-600">Authenticated home</p>
          </div>
          <SignOutButton />
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-600">
              You are signed in
            </p>
            <h1 className="mt-6 text-5xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-7xl">
              Welcome back, {displayName}.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              The homepage now performs a server-side session check. Unauthenticated
              visitors are redirected to a dedicated login flow, while signed-in
              users land here immediately.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm text-slate-700 backdrop-blur">
                {session.user.email}
              </div>
              <div className="rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm text-slate-700 backdrop-blur">
                Session secured with NextAuth credentials
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <article className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_25px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
                Access Flow
              </p>
              <h2 className="mt-4 text-2xl font-semibold text-slate-950">
                Clean entry, no dead-end placeholder screen.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                This route checks the session in the page component, which matches
                the current Next.js guidance for auth checks in App Router pages.
              </p>
            </article>

            <article className="rounded-[2rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_25px_80px_-40px_rgba(15,23,42,0.7)]">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-300">
                Next Step
              </p>
              <h2 className="mt-4 text-2xl font-semibold">
                Plug this page into your real app content.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                The auth gate is now in place, so you can replace this hero with
                your actual logged-in experience without changing the routing logic.
              </p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
