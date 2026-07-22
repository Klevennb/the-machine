"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleUserRound,
  Compass,
  House,
  Library,
  PenLine,
  Search,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon:
    | "home"
    | "library"
    | "explore"
    | "write"
    | "search"
    | "profile"
    | "contest";
  match: "exact" | "prefix";
};

const navIcons: Record<NavItem["icon"], LucideIcon> = {
  home: House,
  library: Library,
  explore: Compass,
  write: PenLine,
  search: Search,
  profile: CircleUserRound,
  contest: Trophy,
};

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="mt-10 space-y-2" aria-label="Primary navigation">
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = navIcons[item.icon];

        return (
          <Link
            className={[
              "flex items-center gap-4 border-l-4 px-5 py-3 text-sm font-semibold transition",
              active
                ? "border-[var(--sage)] bg-[var(--paper-muted)] text-[var(--sage-dark)]"
                : "border-transparent text-[var(--charcoal)] hover:bg-[var(--paper-soft)] hover:text-[var(--sage-dark)]",
            ].join(" ")}
            href={item.href}
            key={item.href}
          >
            <span
              aria-hidden="true"
              className="inline-flex size-5 shrink-0 items-center justify-center"
            >
              <Icon className="size-5" strokeWidth={2} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex justify-around border-t border-[var(--line)] bg-white/95 px-3 py-2 shadow-[0_-10px_30px_-28px_rgba(45,45,45,0.5)] backdrop-blur md:hidden"
      aria-label="Mobile navigation"
    >
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = navIcons[item.icon];

        return (
          <Link
            className={[
              "flex min-w-14 flex-col items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[0.7rem] font-semibold",
              active
                ? "bg-[var(--sage-soft)] text-[var(--sage-dark)]"
                : "text-[var(--muted)] hover:text-[var(--sage-dark)]",
            ].join(" ")}
            href={item.href}
            key={item.href}
          >
            <span
              aria-hidden="true"
              className="inline-flex size-5 shrink-0 items-center justify-center"
            >
              <Icon className="size-5" strokeWidth={2} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
