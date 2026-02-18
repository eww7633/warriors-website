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
  return (
    <html lang="en">
      <body>
        <div className="top-stripe" />
        <header className="site-header">
          <Nav />
        </header>
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
