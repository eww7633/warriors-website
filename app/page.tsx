import Link from "next/link";
import { siteConfig } from "@/lib/siteConfig";
import { getHomepageShowcasePhotos } from "@/lib/showcase-photos";
import { getCurrentUser } from "@/lib/hq/session";

export default async function HomePage() {
  const publicBase = siteConfig.publicSite.baseUrl.replace(/\/$/, "");
  const showcase = await getHomepageShowcasePhotos(9);
  const user = await getCurrentUser();

  return (
    <section className="grid-home">
      <article className="card hero-card">
        <p className="eyebrow">Pittsburgh Warriors Hockey Club</p>
        <h2>Healing through hockey. One public site, one Warrior HQ.</h2>
        <p>
          Public website content lives on the main site. Warrior HQ handles player registration,
          roster operations, event reservations, QR check-ins, and Hockey Ops workflows.
        </p>
        <div className="cta-row">
          <a className="button alt" href={`${publicBase}/`}>
            Open Main Website
          </a>
          {user ? (
            <Link className="button ghost" href={user.role === "admin" ? "/admin" : "/player"}>
              {user.role === "admin" ? "Open Hockey Ops" : "Open My Account"}
            </Link>
          ) : (
            <>
              <Link className="button ghost" href="/register">
                Request Player Access
              </Link>
              <Link className="button" href="/login">
                Player Log in
              </Link>
            </>
          )}
        </div>
      </article>

      <article className="card home-grid-2">
        <div className="event-card">
          <h3>Public Website</h3>
          <ul>
            <li>Program story, leadership, donor messaging</li>
            <li>Partners, sponsors, and social visibility</li>
            <li>Public events preview and recruitment funnel</li>
          </ul>
          <p>
            <a href={`${publicBase}/events`}>View public events page</a>
          </p>
        </div>

        <div className="event-card">
          <h3>Warrior HQ</h3>
          <ul>
            <li>Player approvals, roster control, jersey management</li>
            <li>Reservations, attendance truth, QR check-in tracking</li>
            <li>Competition, game scorekeeper, and live scoring tools</li>
          </ul>
          <p>
            <Link href="/admin">Open Hockey Ops dashboard</Link>
          </p>
        </div>
      </article>

      <article className="card">
        <h3>Player Access Policy</h3>
        <p>
          HQ is restricted to approved players and Hockey Ops staff. Registration alone does not
          grant roster-protected access until an admin approves and assigns roster status.
        </p>
      </article>

      <article className="card">
        <h3>Warriors In Action</h3>
        <p>Featured directly from your shared Drive media library.</p>
        <div className="photo-grid">
          {showcase.map((photo) => (
            <a key={photo.id} href={photo.viewUrl} target="_blank" rel="noreferrer" className="photo-card">
              <img src={photo.imageUrl} alt="Warriors action photo" loading="lazy" />
            </a>
          ))}
        </div>
      </article>
    </section>
  );
}
