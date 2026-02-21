import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/siteConfig";
import { MobileNavMenu } from "@/components/MobileNavMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { getPlayerRosterProfile } from "@/lib/hq/roster";

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim()[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export async function Nav() {
  const user = await getCurrentUser();
  const hasSession = Boolean(user);
  const hasAdminAccess = user ? await canAccessAdminPanel(user) : false;
  const isApprovedPlayer = Boolean(user && user.status === "approved" && (user.role === "player" || user.role === "admin"));
  const isSupporterOrPending = Boolean(hasSession && !isApprovedPlayer);
  const showHqButton = isApprovedPlayer;
  const showOpsButton = Boolean(hasAdminAccess);

  const profile = user && isApprovedPlayer ? await getPlayerRosterProfile(user.id) : null;
  const accountAvatarUrl =
    profile?.photos.find((entry) => entry.isPrimary)?.imageUrl || profile?.photos[0]?.imageUrl || null;

  const publicLinks = [
    ["Support", "/donate"],
    ["Partners", "/partners"],
    ["Players", "/roster"],
    ["Events", "/events"]
  ] as const;

  const aboutLinks = [
    ["Leadership", "/about/leadership"],
    ["Roster", "/about/roster"],
    ["Wall of Champions", "/about/wall-of-champions"],
    ["Galleries", "/about/galleries"]
  ] as const;

  const socials = [
    ["Instagram", siteConfig.social.instagram],
    ["Facebook", siteConfig.social.facebook]
  ] as const;

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
              <Link href="/about">About</Link>
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
          {!hasSession ? (
            <>
              <Link className="button ghost" href="/join?mode=supporter">Sign Up</Link>
              <Link className="button" href="/login">Log In</Link>
            </>
          ) : (
            <>
              {isSupporterOrPending ? <Link className="button alt" href="/donate">Donate</Link> : null}
              {isSupporterOrPending ? <Link className="button ghost" href="/join?mode=player">Join</Link> : null}
              {showHqButton ? <Link className="button ghost" href="/player">HQ</Link> : null}
              {showOpsButton ? <Link className="button ghost" href="/admin">Ops</Link> : null}
            </>
          )}
        </div>

        <MobileNavMenu
          aboutLinks={aboutLinks.map(([label, href]) => ({ label, href }))}
          publicLinks={publicLinks.map(([label, href]) => ({ label, href }))}
          socials={socials.map(([label, href]) => ({ label, href }))}
          hasSession={hasSession}
          isSupporterOrPending={isSupporterOrPending}
          showHqButton={showHqButton}
          showOpsButton={showOpsButton}
        />
      </div>

      {hasSession ? (
        <div className="account-strip" aria-label="Account quick actions">
          <Link href="/account" className="account-chip">
            {accountAvatarUrl ? (
              <img src={accountAvatarUrl} alt={`${user.fullName} avatar`} className="account-avatar" />
            ) : (
              <span className="account-avatar-fallback">{initialsFor(user.fullName)}</span>
            )}
            <span>Welcome {user.fullName}</span>
          </Link>
          <div className="account-hub-switch">
            {showHqButton ? (
              <Link href="/player" className="button ghost account-hub-button">
                HQ
              </Link>
            ) : null}
            {showOpsButton ? (
              <Link href="/admin" className="button ghost account-hub-button">
                Ops
              </Link>
            ) : null}
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="button account-logout-button" type="submit">Log Out</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
