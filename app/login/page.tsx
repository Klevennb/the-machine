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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] px-6 py-16">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(69,100,94,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(69,100,94,0.07)_1px,transparent_1px)] bg-[size:80px_80px] opacity-70" />
      <div className="relative grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="max-w-xl">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-[var(--sage-dark)]">
            Protected Workspace
          </p>
          <h2 className="mt-6 font-literary text-5xl font-bold text-[var(--charcoal)] sm:text-6xl">
            Return to a quieter writing desk.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[var(--charcoal)]/75">
            The homepage is now reserved for authenticated users. Sign in to
            continue, or register in a minute if this is your first time here.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold text-[var(--sage-dark)]">
            <span className="rounded-full bg-white/70 px-4 py-2 backdrop-blur">
              Credentials auth
            </span>
            <span className="rounded-full bg-white/70 px-4 py-2 backdrop-blur">
              Server-side redirect
            </span>
            <span className="rounded-full bg-white/70 px-4 py-2 backdrop-blur">
              Tailwind v4 styling
            </span>
          </div>
        </section>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
