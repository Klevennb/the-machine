import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { SignOutButton } from "@/app/components/sign-out-button";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)]">
        <SignOutButton />
      </div>
    </main>
  );
}
