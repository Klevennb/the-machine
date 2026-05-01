import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { authOptions } from "@/lib/auth";

export default async function SearchPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ProtectedPageShell
      title="Search"
      description="This page will provide search across writing, saved items, and other app content so users can find what they need quickly."
      showHomeLink
    />
  );
}
