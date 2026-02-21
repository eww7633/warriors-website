"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavLink = {
  label: string;
  href: string;
};

type MobileNavMenuProps = {
  aboutLinks: NavLink[];
  publicLinks: NavLink[];
  socials: NavLink[];
  hasSession: boolean;
  isSupporterOrPending: boolean;
  showHqButton: boolean;
  showOpsButton: boolean;
};

export function MobileNavMenu(props: MobileNavMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="mobile-nav">
      <button
        type="button"
        className="mobile-menu-trigger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16a1 1 0 1 0 0-2H4a1 1 0 1 0 0 2Zm16 4H4a1 1 0 1 0 0 2h16a1 1 0 1 0 0-2Zm0 6H4a1 1 0 1 0 0 2h16a1 1 0 1 0 0-2Z" />
        </svg>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="mobile-nav-overlay"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
          />
          <div className="mobile-nav-panel">
            <div className="mobile-nav-head">
              <strong>Menu</strong>
              <button
                type="button"
                className="mobile-nav-close"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            <ul className="mobile-nav-list">
              <li>
                <Link href="/about">About</Link>
              </li>
              {props.aboutLinks.map((link) => (
                <li key={link.href}>
                  <Link className="mobile-sub-link" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
              {props.publicLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
              {!props.hasSession ? (
                <>
                  <li>
                    <Link href="/join?mode=supporter">Sign Up</Link>
                  </li>
                  <li>
                    <Link href="/login">Log In</Link>
                  </li>
                </>
              ) : (
                <>
                  {props.isSupporterOrPending ? (
                    <>
                      <li>
                        <Link href="/donate">Donate</Link>
                      </li>
                      <li>
                        <Link href="/join?mode=player">Join</Link>
                      </li>
                    </>
                  ) : null}
                  {props.showHqButton ? (
                    <li>
                      <Link href="/player">HQ</Link>
                    </li>
                  ) : null}
                  {props.showOpsButton ? (
                    <li>
                      <Link href="/admin">Ops</Link>
                    </li>
                  ) : null}
                  <li>
                    <Link href="/account">Account</Link>
                  </li>
                  <li>
                    <form action="/api/auth/logout" method="post">
                      <button className="button mobile-menu-logout" type="submit">Log Out</button>
                    </form>
                  </li>
                </>
              )}
            </ul>
            <div className="mobile-social-row">
              {props.socials.map((social) => (
                <a key={social.href} href={social.href} aria-label={social.label} target="_blank" rel="noreferrer">
                  {social.label === "Instagram" ? (
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
        </>
      ) : null}
    </div>
  );
}
