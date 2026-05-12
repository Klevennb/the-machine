import Link from "next/link";

export function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`app-card p-5 ${className}`}>{children}</div>;
}

export function PrimaryButton({
  children,
  className = "",
  href,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
}) {
  const classes = `app-button-primary inline-flex items-center justify-center px-5 py-2.5 text-sm ${className}`;

  if (href) {
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  href,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
}) {
  const classes = `app-button-secondary inline-flex items-center justify-center px-5 py-2.5 text-sm ${className}`;

  if (href) {
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

export function StreakChip({
  children,
  tone = "sunset",
}: {
  children: React.ReactNode;
  tone?: "sunset" | "sage";
}) {
  const colors =
    tone === "sunset"
      ? "bg-[var(--sunset-soft)] text-[var(--sunset)]"
      : "bg-[var(--sage-soft)] text-[var(--sage-dark)]";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${colors}`}
    >
      {children}
    </span>
  );
}

export function ProgressRing({
  value,
  label,
  caption,
}: {
  value: number;
  label: string;
  caption: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className="grid size-36 place-items-center rounded-full"
      style={{
        background: `conic-gradient(var(--sage) ${clamped}%, var(--paper-muted) 0)`,
      }}
    >
      <div className="grid size-28 place-items-center rounded-full bg-white text-center">
        <div>
          <p className="font-literary text-3xl font-bold text-[var(--charcoal)]">
            {label}
          </p>
          <p className="text-xs font-semibold text-[var(--muted)]">{caption}</p>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
      <div className="max-w-2xl">
        <h1 className="font-literary text-4xl font-bold leading-tight text-[var(--charcoal)] md:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-base leading-7 text-[var(--charcoal)]/80">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
