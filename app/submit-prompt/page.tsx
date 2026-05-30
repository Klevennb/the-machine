import { redirect } from "next/navigation";
import { PromptForm } from "@/app/submit-prompt/prompt-form";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { getCurrentUserId } from "@/lib/session";

export default async function SubmitPromptPage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  return (
    <ProtectedPageShell
      title="Submit Prompt"
      description="Send a writing prompt to the admin review queue for the public gallery."
      panelClassName="max-w-4xl"
      showHomeLink
    >
      <PromptForm />
    </ProtectedPageShell>
  );
}
