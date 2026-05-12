type MobileDisclosureProps = {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
};

export function MobileDisclosure({
  title,
  eyebrow,
  children,
  className,
}: MobileDisclosureProps) {
  return (
    <details className={["app-disclosure", className].filter(Boolean).join(" ")}>
      <summary className="app-disclosure__summary">
        <span className="app-disclosure__label">
          {eyebrow ? (
            <span className="app-disclosure__eyebrow">{eyebrow}</span>
          ) : null}
          <span className="app-disclosure__title">{title}</span>
        </span>
        <span className="app-disclosure__chevron" aria-hidden="true" />
      </summary>
      <div className="app-disclosure__content">{children}</div>
    </details>
  );
}
