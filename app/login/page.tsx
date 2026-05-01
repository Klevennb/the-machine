import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AuthForm } from "@/app/components/auth-form";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.35),_transparent_28%),linear-gradient(135deg,_#fff7ed_0%,_#fffbeb_32%,_#eef2ff_100%)] px-6 py-16">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />
      <div className="absolute -left-12 top-20 h-48 w-48 rounded-full bg-amber-300/40 blur-3xl" />
      <div className="absolute bottom-12 right-0 h-64 w-64 rounded-full bg-sky-300/35 blur-3xl" />
      <div className="relative grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-600">
            Protected Workspace
          </p>
          <h2 className="mt-6 text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl">
            Draft faster with a front door that actually feels polished.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
            The homepage is now reserved for authenticated users. Sign in to
            continue, or register in a minute if this is your first time here.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-700">
            <span className="rounded-full border border-white/70 bg-white/70 px-4 py-2 backdrop-blur">
              Credentials auth
            </span>
            <span className="rounded-full border border-white/70 bg-white/70 px-4 py-2 backdrop-blur">
              Server-side redirect
            </span>
            <span className="rounded-full border border-white/70 bg-white/70 px-4 py-2 backdrop-blur">
              Tailwind v4 styling
            </span>
          </div>
        </section>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
