import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/siteConfig";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser } from "@/lib/hq/session";

export async function Nav() {
  const user = await getCurrentUser();
  const hasSession = Boolean(user);
  const publicLinks = [
    ["Donate", "/donate"],
    ["Partners", "/partners"],
    ["Join", "/join"],
    ["Events", "/events"]
  ] as const;
  const aboutLinks = [
    ["Leadership", "/about/leadership"],
    ["Roster", "/about/roster"],
    ["Wall of Champions", "/about/wall-of-champions"],
    ["Galleries", "/about/galleries"]
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

  const authPrimaryLabel = hasSession ? "HQ" : "Join";
  const authPrimaryHref = hasSession ? (user?.role === "admin" ? "/admin" : "/player") : "/join";
  const authSecondaryLabel = hasSession ? "Log Out" : "Login";
  const authSecondaryHref = hasSession ? null : "/login";

  return (
    <div className="header-shell">
      <div className="header-top-row">
        <Link href="/" className="brand-link">
          <Image
            src="/brand/warriors-logo-font.svg"
            alt="Pittsburgh Warriors logo"
            width={78}
            height={78}
            priority
            className="brand-logo brand-logo-light"
          />
          <Image
            src="/brand/site-icon-dark.png"
            alt="Pittsburgh Warriors dark logo"
            width={78}
            height={78}
            priority
            className="brand-logo brand-logo-dark"
          />
          <span className="brand-block">
            <span className="brand-name">Pittsburgh Warriors Hockey Club</span>
            <span className="brand-tagline">Veterans healing through hockey</span>
          </span>
        </Link>

        <nav className="main-nav" aria-label="Primary">
          <ul className="nav-list">
            <li className="nav-public-link nav-with-submenu">
              <Link href="/about">About Us</Link>
              <ul className="submenu" aria-label="About pages">
                {aboutLinks.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </li>
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

        <ThemeToggle />

        <div className="auth-actions">
          <Link className="button ghost" href={authPrimaryHref}>
            {authPrimaryLabel}
          </Link>
          {hasSession ? (
            <form action="/api/auth/logout" method="post">
              <button className="button" type="submit">{authSecondaryLabel}</button>
            </form>
          ) : (
            <Link className="button" href={authSecondaryHref ?? "/login"}>
              {authSecondaryLabel}
            </Link>
          )}
        </div>

        <details className="mobile-nav">
          <summary aria-label="Open menu">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16a1 1 0 1 0 0-2H4a1 1 0 1 0 0 2Zm16 4H4a1 1 0 1 0 0 2h16a1 1 0 1 0 0-2Zm0 6H4a1 1 0 1 0 0 2h16a1 1 0 1 0 0-2Z" />
            </svg>
          </summary>
          <div className="mobile-nav-panel">
            <ul className="mobile-nav-list">
              <li>
                <Link href="/about">About Us</Link>
              </li>
              {aboutLinks.map(([label, href]) => (
                <li key={href}>
                  <Link className="mobile-sub-link" href={href}>
                    {label}
                  </Link>
                </li>
              ))}
              {publicLinks.map(([label, href]) => (
                <li key={href}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
              <li>
                <Link href={authPrimaryHref}>{authPrimaryLabel}</Link>
              </li>
              {hasSession ? (
                <li>
                  <form action="/api/auth/logout" method="post">
                    <button className="button" type="submit">{authSecondaryLabel}</button>
                  </form>
                </li>
              ) : (
                <li>
                  <Link href={authSecondaryHref ?? "/login"}>{authSecondaryLabel}</Link>
                </li>
              )}
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
            </div>
          </div>
        </details>
      </div>

      {hasSession ? (
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
