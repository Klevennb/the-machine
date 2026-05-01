import Link from "next/link";
import { ProtectedHeader } from "@/app/components/protected-header";

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
  const panelClasses = [
    "w-full rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)] sm:p-10",
    panelClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-h-screen bg-slate-100">
      <ProtectedHeader />
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-5xl items-center justify-center px-6 py-10">
        <div className={panelClasses}>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            {description}
          </p>
          {children ? <div className="mt-8">{children}</div> : null}
          {showHomeLink ? (
            <div className="mt-8">
              <Link
                className="inline-flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                href="/"
              >
                Return Home
              </Link>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
