import Link from "next/link";
import { getPublicPublishedEvents } from "@/lib/hq/events";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await getPublicPublishedEvents();
  const upcoming = events
    .filter((event) => new Date(event.date).getTime() >= Date.now())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <section className="stack">
      <article className="card">
        <p className="eyebrow">Events</p>
        <h1>Upcoming Public Events</h1>
        <p className="hero-lead">
          Join us at upcoming games, volunteer events, and community gatherings supporting veteran athletes.
        </p>
      </article>

      <article className="card">
        <div className="stack">
          {upcoming.map((event) => (
            <article key={event.id} className="event-card public-event-card">
              <div className="event-top">
                <h3>{event.title}</h3>
                <span className="event-date-chip">
                  {new Date(event.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
              <p>{new Date(event.date).toLocaleString()}</p>
              {event.locationPublic ? <p>{event.locationPublic}</p> : null}
              <p>{event.publicDetails}</p>
              <div className="cta-row">
                <Link className="button ghost" href={`/calendar?event=${encodeURIComponent(event.id)}`}>
                  Event Details
                </Link>
                <a className="button" href="/donate">
                  Support The Program
                </a>
              </div>
            </article>
          ))}
          {upcoming.length === 0 ? <p className="muted">No upcoming public events are posted yet.</p> : null}
        </div>
      </article>
    </section>
  );
}
