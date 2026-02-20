import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pittsburgh Warriors Hockey Club",
  description: "Official website, player portal, and operations tools.",
  icons: {
    icon: "/brand/site-icon.png",
    apple: "/brand/site-icon.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var saved=localStorage.getItem('warriors-theme');var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=(saved==='dark'||saved==='light')?saved:(prefersDark?'dark':'light');document.documentElement.setAttribute('data-theme',theme);}catch(e){}})();"
          }}
        />
      </head>
      <body>
        <div className="top-stripe" />
        <header className="site-header">
          <Nav />
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <div className="site-footer-shell">
            <div className="footer-supported-by">
              <p className="footer-supported-title">Supported By</p>
              <div className="footer-sponsor-grid">
                <img src="/sponsors/operation-hat-trick.avif" alt="Operation Hat Trick" loading="lazy" />
                <img src="/sponsors/ppf-grant.avif" alt="PPF Grant" loading="lazy" />
                <img src="/sponsors/ugf-logo-horz.avif" alt="UGF" loading="lazy" />
                <div className="footer-sponsor-placeholder">Malone Family Foundation</div>
              </div>
            </div>
            <p>
              <strong>Pittsburgh Warriors Hockey Club</strong> &copy; {year}
            </p>
            <p>Veterans Healing Through Hockey | 501(c)(3) nonprofit program.</p>
            <p>
              Contact: <a href="mailto:ops@pghwarriorhockey.org">ops@pghwarriorhockey.org</a> |{" "}
              <a href="/contact">Contact page</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
