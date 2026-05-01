import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { WriteEditor } from "@/app/components/write-editor";
import { authOptions } from "@/lib/auth";

export default async function WritePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ProtectedPageShell
      title="Write"
      description="The writing workspace now includes a Lexical editor with the common rich text controls you would expect in a modern drafting surface."
      panelClassName="max-w-5xl"
      showHomeLink
    >
      <WriteEditor />
    </ProtectedPageShell>
  );
}
