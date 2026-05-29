import Link from "next/link";

export default function MaintenancePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-6 py-16">
      <section className="max-w-xl text-center">
        <p className="text-sm font-extrabold uppercase tracking-[0.32em] text-[var(--sage-dark)]">
          WriteNow
        </p>
        <h1 className="mt-6 font-literary text-5xl font-bold leading-tight text-[var(--charcoal)]">
          Under maintenance
        </h1>
        <p className="mt-5 text-base font-medium leading-7 text-[var(--charcoal)]/75">
          We are making a few account updates. Please check back shortly.
        </p>
        <Link className="app-button-primary mt-8 inline-flex px-5 py-3 text-sm" href="/maintenance">
          Check status
        </Link>
      </section>
    </main>
  );
}
