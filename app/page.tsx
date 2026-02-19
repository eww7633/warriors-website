import Link from "next/link";
import { siteConfig } from "@/lib/siteConfig";
import { getHomepageShowcasePhotos } from "@/lib/showcase-photos";
import { getCurrentUser } from "@/lib/hq/session";
import { getAllEvents } from "@/lib/hq/events";
import { readStore } from "@/lib/hq/store";

export default async function HomePage() {
  const publicBase = siteConfig.publicSite.baseUrl.replace(/\/$/, "");
  const showcase = await getHomepageShowcasePhotos(12);
  const user = await getCurrentUser();
  const [events, store] = await Promise.all([getAllEvents(), readStore()]);
  const now = Date.now();
  const upcomingEvents = events
    .filter((event) => new Date(event.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);
  const pendingRegistrations = store.users.filter((entry) => entry.status === "pending").length;
  const approvedPlayers = store.users.filter(
    (entry) => entry.status === "approved" && entry.role === "player"
  ).length;
  const recentCheckIns = store.checkIns
    .filter((entry) => {
      const stamp = entry.checkedInAt || entry.arrivedAt;
      if (!stamp) {
        return false;
      }
      return Date.now() - new Date(stamp).getTime() <= 7 * 24 * 60 * 60 * 1000;
    })
    .length;

  return (
    <section className="grid-home">
      <article className="card hero-card">
        <p className="eyebrow">Warrior HQ Live Updates</p>
        <h2>Latest activity across players, events, and attendance</h2>
        <div className="home-live-grid">
          <div className="event-card">
            <strong>Pending registrations</strong>
            <p>{pendingRegistrations}</p>
          </div>
          <div className="event-card">
            <strong>Approved players</strong>
            <p>{approvedPlayers}</p>
          </div>
          <div className="event-card">
            <strong>7-day check-ins</strong>
            <p>{recentCheckIns}</p>
          </div>
          <div className="event-card">
            <strong>Upcoming events</strong>
            <p>{upcomingEvents.length}</p>
          </div>
        </div>
        <div className="stack">
          {upcomingEvents.map((event) => (
            <div key={event.id} className="event-card">
              <strong>{event.title}</strong>
              <p>{new Date(event.date).toLocaleString()}</p>
              {event.locationPublic && <p>{event.locationPublic}</p>}
            </div>
          ))}
          {upcomingEvents.length === 0 && <p className="muted">No upcoming events found.</p>}
        </div>
        <div className="cta-row">
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
            <Link href={user?.role === "admin" ? "/admin" : "/player"}>
              Open {user?.role === "admin" ? "Hockey Ops dashboard" : "player account"}
            </Link>
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
