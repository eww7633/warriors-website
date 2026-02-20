import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/siteConfig";
import { getCurrentUser } from "@/lib/hq/session";

export async function Nav() {
  const user = await Promise.race([
    getCurrentUser(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200))
  ]);
  const publicLinks = [
    ["About Us", "/about"],
    ["Donate", "/donate"],
    ["Partners", "/partners"],
    ["Join", "/join"],
    ["Events", "/events"]
  ] as const;
  const hqLinks = [
    ["Calendar", "/calendar"],
    ["Games", "/games"],
    ["Roster", "/roster"],
    ["Seasons", "/seasons"]
  ] as const;

  const socials = [
    ["Instagram", siteConfig.social.instagram],
    ["Facebook", siteConfig.social.facebook]
  ] as const;

  const authLabel = user ? (user.role === "admin" ? "Hockey Ops" : "Warrior HQ") : "Log in";
  const authHref = user ? (user.role === "admin" ? "/admin" : "/player") : "/login";

  return (
    <div className="header-shell">
      <div className="header-top-row">
        <Link href="/" className="brand-link">
          <Image
            src="/brand/warriors-logo-font.svg"
            alt="Pittsburgh Warriors logo"
            width={62}
            height={62}
            priority
          />
          <span className="brand-block">
            <span className="brand-name">Pittsburgh Warriors Hockey Club</span>
            <span className="brand-tagline">Veterans healing through hockey</span>
          </span>
        </Link>

        <nav className="main-nav" aria-label="Primary">
          <ul className="nav-list">
            {publicLinks.map(([label, href]) => (
              <li key={href} className="nav-public-link">
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <ul className="social-list" aria-label="Social links">
          {socials.map(([name, href]) => (
            <li key={name}>
              <a href={href} aria-label={name} target="_blank" rel="noreferrer">
                {name === "Instagram" ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm-5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5Zm5.2-2.4a1.1 1.1 0 1 1-1.1 1.1 1.1 1.1 0 0 1 1.1-1.1Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M13.5 22v-8h2.8l.5-3h-3.3V9.2c0-.9.3-1.5 1.6-1.5H17V4.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2V11H8v3h2.5v8h3Z" />
                  </svg>
                )}
              </a>
            </li>
          ))}
        </ul>

        <div className="auth-actions">
          <Link className="button alt" href="/donate">
            Donate
          </Link>
          <Link className="button" href={authHref}>
            {authLabel}
          </Link>
          {user ? (
            <form action="/api/auth/logout" method="post">
              <button className="button ghost" type="submit">Log out</button>
            </form>
          ) : null}
        </div>

        <details className="mobile-nav">
          <summary>Menu</summary>
          <div className="mobile-nav-panel">
            <ul className="mobile-nav-list">
              {publicLinks.map(([label, href]) => (
                <li key={href}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
              <li>
                <Link href={authHref}>{authLabel}</Link>
              </li>
              {user ? (
                <li>
                  <form action="/api/auth/logout" method="post">
                    <button className="button ghost" type="submit">Log out</button>
                  </form>
                </li>
              ) : null}
            </ul>
            <div className="mobile-social-row">
              {socials.map(([name, href]) => (
                <a key={name} href={href} aria-label={name} target="_blank" rel="noreferrer">
                  {name === "Instagram" ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm-5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5Zm5.2-2.4a1.1 1.1 0 1 1-1.1 1.1 1.1 1.1 0 0 1 1.1-1.1Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M13.5 22v-8h2.8l.5-3h-3.3V9.2c0-.9.3-1.5 1.6-1.5H17V4.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2V11H8v3h2.5v8h3Z" />
                    </svg>
                  )}
                </a>
              ))}
              <Link className="button alt" href="/donate">
                Donate
              </Link>
            </div>
          </div>
        </details>
      </div>

      {user ? (
        <nav className="hq-subnav" aria-label="HQ sections">
          <ul className="hq-subnav-list">
            {hqLinks.map(([label, href]) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
