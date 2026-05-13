import { getServerSession } from "next-auth";
import Link from "next/link";
import { MobileNav, SidebarNav, type NavItem } from "@/app/components/app-nav";
import { PageHeader } from "@/app/components/app-ui";
import { SignOutButton } from "@/app/components/sign-out-button";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ProtectedPageShellProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
  showHomeLink?: boolean;
  panelClassName?: string;
};

export function ProtectedPageShell({
  title,
  description,
  children,
  showHomeLink = false,
  panelClassName,
}: ProtectedPageShellProps) {
  return (
    <ProtectedAppShell
      description={description}
      panelClassName={panelClassName}
      showHomeLink={showHomeLink}
      title={title}
    >
      {children}
    </ProtectedAppShell>
  );
}

const navItems: NavItem[] = [
  { href: "/", label: "Hub", icon: "home", match: "exact" },
  { href: "/library", label: "Library", icon: "library", match: "prefix" },
  { href: "/explore", label: "Explore", icon: "explore", match: "prefix" },
  { href: "/write", label: "Write", icon: "write", match: "prefix" },
  { href: "/search", label: "Search", icon: "search", match: "prefix" },
  { href: "/profile", label: "Profile", icon: "profile", match: "prefix" },
];

function getDisplayName(user: {
  name?: string | null;
  username?: string | null;
  email?: string | null;
}) {
  return user.name?.trim() || user.username?.trim() || user.email?.trim() || "Writer";
}

export async function ProtectedAppShell({
  title,
  description,
  children,
  showHomeLink = false,
  panelClassName,
}: ProtectedPageShellProps) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const [pendingRequestCount, currentUser] = await Promise.all([
    userId
      ? prisma.friendship.count({
          where: {
            addresseeId: userId,
            status: "PENDING",
            ignoredAt: null,
          },
        })
      : 0,
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, username: true, email: true },
        })
      : null,
  ]);

  const contentClasses = [
    "mx-auto w-full max-w-7xl px-5 pb-28 pt-8 md:px-10 md:py-10 lg:px-14",
    panelClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-[var(--line)] bg-[var(--paper-soft)]/92 py-8 md:flex md:flex-col">
        <div className="px-7">
          <Link
            className="font-literary text-4xl font-bold text-[var(--sage-dark)]"
            href="/"
          >
            WriteNow
          </Link>
          <div className="mt-10 rounded-2xl bg-white/55 p-4">
            <p className="text-sm font-bold text-[var(--charcoal)]">
              Welcome, {getDisplayName(currentUser ?? {})}
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--sunset)]">
              {pendingRequestCount > 0
                ? `${pendingRequestCount} request${pendingRequestCount === 1 ? "" : "s"} waiting`
                : "Ready to write"}
            </p>
          </div>
        </div>
        <SidebarNav items={navItems} />
        <div className="mt-auto space-y-4 border-t border-[var(--line)] px-7 pt-6">
          <Link className="block text-sm font-semibold text-[var(--muted)]" href="/search">
            Requests
            {pendingRequestCount > 0 ? (
              <span className="ml-2 rounded-full bg-[var(--sunset-soft)] px-2 py-0.5 text-xs text-[var(--sunset)]">
                {pendingRequestCount}
              </span>
            ) : null}
          </Link>
          <SignOutButton />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--line)] bg-[var(--background)]/90 px-5 py-4 backdrop-blur md:hidden">
        <Link
          className="font-literary text-3xl font-bold text-[var(--sage-dark)]"
          href="/"
        >
          WriteNow
        </Link>
        <Link
          className="rounded-full bg-[var(--paper-muted)] px-3 py-1 text-xs font-bold text-[var(--sage-dark)]"
          href="/search"
        >
          {pendingRequestCount > 0 ? `${pendingRequestCount} requests` : "Search"}
        </Link>
      </header>

      <main className="md:pl-72">
        <div className={contentClasses}>
          <PageHeader title={title} description={description} />
          {children ? <div>{children}</div> : null}
          {showHomeLink ? (
            <div className="mt-10">
              <Link
                className="app-button-secondary inline-flex px-5 py-2.5 text-sm"
                href="/"
              >
                Return to Hub
              </Link>
            </div>
          ) : null}
        </div>
      </main>
      <MobileNav items={navItems} />
    </div>
  );
}
