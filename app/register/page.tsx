import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AuthForm } from "@/app/components/auth-form";
import { authOptions } from "@/lib/auth";

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(125,211,252,0.35),_transparent_28%),linear-gradient(135deg,_#f8fafc_0%,_#fef3c7_38%,_#ecfeff_100%)] px-6 py-16">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.1)_1px,transparent_1px)] bg-[size:80px_80px] opacity-50" />
      <div className="absolute left-8 top-24 h-56 w-56 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="absolute bottom-0 right-12 h-56 w-56 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="relative grid w-full max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <AuthForm mode="register" />
        <section className="max-w-xl justify-self-end">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-600">
            First Visit
          </p>
          <h2 className="mt-6 text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl">
            Set up your access and land straight in the app.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
            Registration feeds your existing auth API, then signs you in with the
            same credentials flow so there is no extra handoff.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/70 bg-white/70 p-4 backdrop-blur">
              Account creation checks for duplicate emails before storing a hashed
              password.
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/70 p-4 backdrop-blur">
              After registration, the form signs in automatically and forwards
              you to the protected homepage.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
