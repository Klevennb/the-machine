import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AuthForm } from "@/app/components/auth-form";
import { AuthHeroShell } from "@/app/components/auth-hero-shell";
import { authOptions } from "@/lib/auth";

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
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
      <AuthForm mode="register" />
    </AuthHeroShell>
  );
}
