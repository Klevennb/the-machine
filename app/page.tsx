import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { ProtectedPageShell } from "@/app/components/protected-page-shell";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const pages = [
    { href: "/write", label: "Write" },
    { href: "/library", label: "Library" },
    { href: "/explore", label: "Explore" },
    { href: "/search", label: "Search" },
    { href: "/user", label: "User" },
  ];

  return (
    <ProtectedPageShell
      title="Home"
      description="Choose an area of the app to explore. These routes are now scaffolded and ready for their real functionality later."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => (
          <Link
            key={page.href}
            className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-base font-medium text-slate-800 transition hover:border-slate-300 hover:bg-white"
            href={page.href}
          >
            {page.label}
          </Link>
        ))}
      </div>
    </ProtectedPageShell>
  );
}
