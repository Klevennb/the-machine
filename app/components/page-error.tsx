"use client";

import { useEffect } from "react";

type PageErrorProps = {
  error: Error & { digest?: string };
  sectionName: string;
  unstable_retry: () => void;
};

export function PageError({ error, sectionName, unstable_retry }: PageErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-6 py-16">
      <section className="max-w-xl text-center">
        <p className="text-sm font-extrabold uppercase tracking-[0.32em] text-[var(--sage-dark)]">
          {sectionName}
        </p>
        <h1 className="mt-6 font-literary text-4xl font-bold leading-tight text-[var(--charcoal)]">
          We could not load this page.
        </h1>
        <p className="mt-5 text-base font-medium leading-7 text-[var(--charcoal)]/75">
          Your account data is still protected. Try loading this section again.
        </p>
        <button
          className="app-button-primary mt-8 px-5 py-3 text-sm"
          onClick={() => unstable_retry()}
          type="button"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
