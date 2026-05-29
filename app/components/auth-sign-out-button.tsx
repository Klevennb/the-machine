"use client";

import { SignOutButton as ClerkSignOutButton } from "@clerk/nextjs";

type AuthSignOutButtonProps = {
  children: React.ReactNode;
};

export function AuthSignOutButton({ children }: AuthSignOutButtonProps) {
  return <ClerkSignOutButton redirectUrl="/login">{children}</ClerkSignOutButton>;
}
