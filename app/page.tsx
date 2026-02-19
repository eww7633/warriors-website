import Link from "next/link";
import { siteConfig } from "@/lib/siteConfig";
import { getHomepageShowcasePhotos } from "@/lib/showcase-photos";
import { getCurrentUser } from "@/lib/hq/session";
import { getAllEvents } from "@/lib/hq/events";
import { readStore } from "@/lib/hq/store";

export default async function HomePage() {
  const publicBase = siteConfig.publicSite.baseUrl.replace(/\/$/, "");
  const [showcaseResult, userResult, eventsResult, storeResult] = await Promise.allSettled([
    getHomepageShowcasePhotos(12),
    getCurrentUser(),
    getAllEvents(),
    readStore()
  ]);
  const showcase = showcaseResult.status === "fulfilled" ? showcaseResult.value : [];
  const user = userResult.status === "fulfilled" ? userResult.value : null;
  const events = eventsResult.status === "fulfilled" ? eventsResult.value : [];
  const store =
    storeResult.status === "fulfilled"
      ? storeResult.value
      : { users: [], sessions: [], checkIns: [] };
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
  const upcomingDateLabel =
    upcomingEvents.length > 0 ? new Date(upcomingEvents[0].date).toLocaleString() : "No upcoming events";
  const welcomeName = user?.fullName?.trim().split(" ")[0] ?? "Warrior";
  const signedInSummary = user
    ? `${user.fullName} | ${user.role === "admin" ? "Hockey Ops" : "Player"}${user.status ? ` | ${user.status}` : ""}`
    : "";

  return (
    <section className="grid-home">
      <article className="card hero-card hero-sleek">
        <p className="eyebrow">Pittsburgh Warriors Hockey Club</p>
        <h1>{user ? `Welcome back, ${welcomeName}.` : "Healing Through Hockey."}</h1>
        {user ? <p className="session-label">Signed in as {signedInSummary}</p> : null}
        <p className="hero-lead">
          Unified public website and Warrior HQ operations for players, events, rosters, and attendance.
        </p>
        <div className="hero-stat-row">
          <div className="hero-stat">
            <span>Pending</span>
            <strong>{pendingRegistrations}</strong>
          </div>
          <div className="hero-stat">
            <span>Active players</span>
            <strong>{approvedPlayers}</strong>
          </div>
          <div className="hero-stat">
            <span>7-day check-ins</span>
            <strong>{recentCheckIns}</strong>
          </div>
          <div className="hero-stat">
            <span>Next event</span>
            <strong>{upcomingDateLabel}</strong>
          </div>
        </div>
        <div className="cta-row">
          {user ? (
            <Link className="button" href={user.role === "admin" ? "/admin" : "/player"}>
              {user.role === "admin" ? "Open Hockey Ops" : "Open Warrior HQ"}
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
          <a className="button ghost" href={`${publicBase}/events`}>
            Public Events
          </a>
        </div>
      </article>

      <article className="card sleek-events">
        <h3>Upcoming Events</h3>
        <div className="stack">
          {upcomingEvents.map((event) => (
            <div key={event.id} className="event-card">
              <strong>{event.title}</strong>
              <p>{new Date(event.date).toLocaleString()}</p>
              {event.locationPublic ? <p>{event.locationPublic}</p> : null}
              <p>
                <Link href={`/calendar?event=${encodeURIComponent(event.id)}`}>
                  Open event details
                </Link>
              </p>
            </div>
          ))}
          {upcomingEvents.length === 0 ? <p className="muted">No upcoming events scheduled yet.</p> : null}
        </div>
      </article>

      <article className="card home-gallery">
        <h3>Warriors In Action</h3>
        <p className="muted">Featured from your shared media folders.</p>
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
