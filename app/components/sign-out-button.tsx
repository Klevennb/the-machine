"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      Sign out
    </button>
  );
}
