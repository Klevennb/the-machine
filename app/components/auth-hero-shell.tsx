import Image from "next/image";
import landingHero from "@/assets/lukas-blazek-GnvurwJsKaY-unsplash.jpg";

type AuthHeroShellProps = {
  badge: string;
  title: string;
  description: string;
  highlights: string[];
  children: React.ReactNode;
  formFirst?: boolean;
};

const PHOTO_CREDIT = "Photo by Lukas Blazek on Unsplash";
const PHOTO_DESCRIPTION =
  "Desk with a blank page, keyboard, earbuds, and a cup of coffee.";

export function AuthHeroShell({
  badge,
  title,
  description,
  highlights,
  children,
  formFirst = false,
}: AuthHeroShellProps) {
  const heroId = `${formFirst ? "register" : "login"}-hero-title`;
  const descriptionId = `${formFirst ? "register" : "login"}-hero-description`;

  return (
    <main
      aria-labelledby={heroId}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] px-6 py-16"
    >
      <figure
        aria-label={`${PHOTO_DESCRIPTION} ${PHOTO_CREDIT}.`}
        className="absolute inset-0"
      >
        <Image
          alt={`${PHOTO_DESCRIPTION} ${PHOTO_CREDIT}.`}
          className="object-cover"
          fill
          placeholder="blur"
          priority
          sizes="100vw"
          src={landingHero}
        />
        <figcaption className="sr-only">{PHOTO_CREDIT}</figcaption>
      </figure>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(250,248,239,0.97),rgba(250,248,239,0.86)_42%,rgba(250,248,239,0.42)),linear-gradient(0deg,rgba(30,38,35,0.28),rgba(30,38,35,0.1))]"
      />

      <div
        aria-describedby={descriptionId}
        className={`relative grid w-full max-w-6xl gap-10 lg:items-center ${
          formFirst
            ? "lg:grid-cols-[0.95fr_1.05fr]"
            : "lg:grid-cols-[1.1fr_0.9fr]"
        }`}
      >
        {formFirst ? children : null}

        <section
          aria-labelledby={heroId}
          className={`max-w-xl ${formFirst ? "justify-self-end" : ""}`}
        >
          <p className="text-sm font-extrabold uppercase tracking-[0.32em] text-[var(--sage-dark)]">
            {badge}
          </p>
          <h1
            className="mt-6 max-w-2xl font-literary text-5xl font-bold leading-tight text-[var(--charcoal)] drop-shadow-sm sm:text-6xl"
            id={heroId}
          >
            {title}
          </h1>
          <p
            className="mt-6 max-w-lg text-lg font-medium leading-8 text-[var(--charcoal)]"
            id={descriptionId}
          >
            {description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold text-[var(--sage-dark)]">
            {highlights.map((highlight) => (
              <span
                className="rounded-full bg-white/90 px-4 py-2 shadow-sm backdrop-blur"
                key={highlight}
              >
                {highlight}
              </span>
            ))}
          </div>
        </section>

        {formFirst ? null : children}
      </div>
    </main>
  );
}
