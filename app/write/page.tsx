import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { authOptions } from "@/lib/auth";

export default async function WritePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ProtectedPageShell
      title="Write"
      description="This page will become the main writing workspace, where users can draft, edit, and organize their content."
      showHomeLink
    />
  );
}
