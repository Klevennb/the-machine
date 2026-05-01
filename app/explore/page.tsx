import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { authOptions } from "@/lib/auth";

export default async function ExplorePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ProtectedPageShell
      title="Explore"
      description="This page will surface discovery features, recommended content, and ideas users may want to browse for inspiration."
      showHomeLink
    />
  );
}
