import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/siteConfig";
import { getCurrentUser } from "@/lib/hq/session";

export async function Nav() {
  const user = await getCurrentUser();
  const publicBase = siteConfig.publicSite.baseUrl.replace(/\/$/, "");
  const publicLinks = [
    ["About Us", siteConfig.publicSite.links.about],
    ["Donate", siteConfig.publicSite.links.donate],
    ["Partners", siteConfig.publicSite.links.partners],
    ["Join", siteConfig.publicSite.links.join],
    ["Events", siteConfig.publicSite.links.events]
  ] as const;
  const hqLinks = [
    ["Calendar", "/calendar"],
    ["Games", "/games"],
    ["Roster", "/roster"],
    ["Seasons", "/seasons"]
  ] as const;

  const socials = [
    ["Instagram", siteConfig.social.instagram, "IG"],
    ["Facebook", siteConfig.social.facebook, "FB"]
  ] as const;

  return (
    <div className="header-shell">
      <div className="header-top-row">
        <a href={publicBase} className="brand-link">
          <Image
            src="/brand/warriors-logo-font.svg"
            alt="Pittsburgh Warriors logo"
            width={62}
            height={62}
            priority
          />
          <span className="brand-name">Pittsburgh Warriors Hockey Club</span>
        </a>

        <nav className="main-nav" aria-label="Primary">
          <ul className="nav-list">
            {publicLinks.map(([label, href]) => (
              <li key={href} className="nav-public-link">
                <a href={href}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <ul className="social-list" aria-label="Social links">
          {socials.map(([name, href, short]) => (
            <li key={name}>
              <a href={href} aria-label={name} target="_blank" rel="noreferrer">
                {short}
              </a>
            </li>
          ))}
        </ul>

        <div className="auth-actions">
          {user ? (
            <>
              <span className="user-pill">
                Signed in: {user.fullName} ({user.role})
              </span>
              <Link className="button ghost" href={user.role === "admin" ? "/admin" : "/player"}>
                {user.role === "admin" ? "Hockey Ops" : "My Account"}
              </Link>
              <form action="/api/auth/logout" method="post">
                <button className="button" type="submit">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link className="button ghost" href="/register">
                Join HQ
              </Link>
              <Link className="button" href="/login">
                Log in
              </Link>
            </>
          )}
        </div>
      </div>

      <nav className="hq-subnav" aria-label="HQ sections">
        <ul className="hq-subnav-list">
          {hqLinks.map(([label, href]) => (
            <li key={href}>
              <Link href={href}>{label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
