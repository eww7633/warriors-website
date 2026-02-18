import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/siteConfig";

export function Nav() {
  const links = [
    ["About Us", "/history"],
    ["Partners", "/news"],
    ["Join", "/player"],
    ["Calendar", "/calendar"],
    ["Games", "/games"],
    ["Seasons", "/seasons"]
  ] as const;

  const socials = [
    ["Instagram", siteConfig.social.instagram, "IG"],
    ["Facebook", siteConfig.social.facebook, "FB"]
  ] as const;

  return (
    <div className="header-shell">
      <Link href="/" className="brand-link">
        <Image
          src="/brand/warriors-logo-font.svg"
          alt="Pittsburgh Warriors logo"
          width={74}
          height={74}
          priority
        />
        <span className="brand-name">Pittsburgh Warriors Hockey Club</span>
      </Link>

      <nav className="main-nav" aria-label="Primary">
        <ul className="nav-list">
          {links.map(([label, href]) => (
            <li key={href}>
              <Link href={href}>{label}</Link>
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
        <Link className="button ghost" href="/admin?role=admin">
          Warrior HQ
        </Link>
        <Link className="button" href="/player?role=player">
          My Account
        </Link>
      </div>
    </div>
  );
}
