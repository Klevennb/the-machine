import { redirect } from "next/navigation";
import { AuthHeroShell } from "@/app/components/auth-hero-shell";
import { AuthSignUp } from "@/app/components/auth-sign-up";
import { getCurrentAuthProviderUserId } from "@/lib/auth";

export default async function RegisterPage() {
  const userId = await getCurrentAuthProviderUserId();

  if (userId) {
    redirect("/");
  }

  return (
    <AuthHeroShell
      badge="Start WriteAway"
      description="Build a calm place for your drafts, word goals, prompt responses, and finished pieces. Share only when you choose to."
      formFirst
      highlights={["Your work stays yours", "Streaks for steady practice", "Optional sharing"]}
      title="Start your private writing practice."
    >
      <AuthSignUp />
    </AuthHeroShell>
  );
}
