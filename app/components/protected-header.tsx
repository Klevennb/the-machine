import Link from "next/link";
import { SignOutButton } from "@/app/components/sign-out-button";

export function ProtectedHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link
          className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-700"
          href="/"
        >
          WriteNow
        </Link>
        <SignOutButton />
      </div>
    </header>
  );
}
