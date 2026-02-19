import Link from "next/link";

const aboutLinks = [
  { href: "/about", label: "About" },
  { href: "/about/leadership", label: "Leadership" },
  { href: "/about/roster", label: "Roster" },
  { href: "/about/wall-of-champions", label: "Wall of Champions" },
  { href: "/about/galleries", label: "Galleries" }
] as const;

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="stack">
      <article className="card about-shell">
        <p className="eyebrow">About The Program</p>
        <h1>Pittsburgh Warriors</h1>
        <p className="hero-lead">
          A veteran-led hockey program built to restore community, confidence, and purpose through competition,
          camaraderie, and service.
        </p>
        <nav className="about-subnav" aria-label="About pages">
          {aboutLinks.map((item) => (
            <Link key={item.href} href={item.href} className="about-subnav-link">
              {item.label}
            </Link>
          ))}
        </nav>
      </article>
      {children}
    </section>
  );
}
