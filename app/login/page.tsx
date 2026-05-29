import { redirect } from "next/navigation";
import { AuthSignIn } from "@/app/components/auth-sign-in";
import { AuthHeroShell } from "@/app/components/auth-hero-shell";
import { getCurrentAuthProviderUserId } from "@/lib/auth";

export default async function LoginPage() {
  const userId = await getCurrentAuthProviderUserId();

  if (userId) {
    redirect("/");
  }

  return (
    <AuthHeroShell
      badge="WriteAway"
      description="Pick up your private drafts, keep your daily streak moving, and find a prompt when the blank page needs a first sentence."
      highlights={["Private by default", "Daily writing goals", "Prompt-led starts"]}
      title="Return to your writing desk."
    >
      <AuthSignIn />
    </AuthHeroShell>
  );
}
