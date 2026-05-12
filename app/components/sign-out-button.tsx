"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="app-button-secondary px-4 py-2 text-sm"
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      Sign out
    </button>
  );
}
