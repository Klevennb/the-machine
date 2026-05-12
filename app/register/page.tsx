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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] px-6 py-16">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(69,100,94,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(69,100,94,0.07)_1px,transparent_1px)] bg-[size:80px_80px] opacity-70" />
      <div className="relative grid w-full max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <AuthForm mode="register" />
        <section className="max-w-xl justify-self-end">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-[var(--sage-dark)]">
            First Visit
          </p>
          <h2 className="mt-6 font-literary text-5xl font-bold text-[var(--charcoal)] sm:text-6xl">
            Set up your writing space.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[var(--charcoal)]/75">
            Registration feeds your existing auth API, then signs you in with the
            same credentials flow so there is no extra handoff.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-[var(--charcoal)]/75 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/70 p-4 backdrop-blur">
              Account creation checks for duplicate emails before storing a hashed
              password.
            </div>
            <div className="rounded-2xl bg-white/70 p-4 backdrop-blur">
              After registration, the form signs in automatically and forwards
              you to the protected homepage.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
