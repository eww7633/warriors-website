import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/siteConfig";
import { getCurrentUser } from "@/lib/hq/session";

export async function Nav() {
  const user = await getCurrentUser();
  const links = [
    ["About Us", "/history"],
    ["Roster", "/roster"],
    ["Partners", "/partners"],
    ["Join", "/register"],
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
        {user ? (
          <>
            <Link className="button ghost" href={user.role === "admin" ? "/admin" : "/player"}>
              {user.role === "admin" ? "Warrior HQ" : "My Account"}
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="button" type="submit">Log out</button>
            </form>
          </>
        ) : (
          <>
            <Link className="button ghost" href="/register">
              Register
            </Link>
            <Link className="button" href="/login">
              Log in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
