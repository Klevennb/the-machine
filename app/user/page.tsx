import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { authOptions } from "@/lib/auth";

export default async function UserPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ProtectedPageShell
      title="User"
      description="This page will handle the user profile, account preferences, and any personal settings tied to the signed-in account."
      showHomeLink
    />
  );
}
