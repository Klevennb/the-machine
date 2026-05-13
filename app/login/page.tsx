import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AuthForm } from "@/app/components/auth-form";
import { AuthHeroShell } from "@/app/components/auth-hero-shell";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/");
  }

  return (
    <AuthHeroShell
      badge="WriteAway"
      description="Pick up your private drafts, keep your daily streak moving, and find a prompt when the blank page needs a first sentence."
      highlights={["Private by default", "Daily writing goals", "Prompt-led starts"]}
      title="Return to your writing desk."
    >
      <AuthForm mode="login" />
    </AuthHeroShell>
  );
}
