"use client";

import { AuthSignOutButton } from "@/app/components/auth-sign-out-button";

export function SignOutButton() {
  return (
    <AuthSignOutButton>
      <button className="app-button-secondary px-4 py-2 text-sm" type="button">
        Sign out
      </button>
    </AuthSignOutButton>
  );
}
