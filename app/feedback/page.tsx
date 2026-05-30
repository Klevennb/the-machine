import { redirect } from "next/navigation";
import { FeedbackForm } from "@/app/feedback/feedback-form";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { getCurrentUserId } from "@/lib/session";

export default async function FeedbackPage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  return (
    <ProtectedPageShell
      title="Feedback"
      description="Send private feedback to the WriteNow admins. Attach a screenshot or image when it helps explain the issue."
      panelClassName="max-w-4xl"
      showHomeLink
    >
      <FeedbackForm />
    </ProtectedPageShell>
  );
}
