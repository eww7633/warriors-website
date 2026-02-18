import { events } from "@/lib/mockData";
import { getCurrentUser } from "@/lib/hq/session";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  const canViewPrivate = Boolean(
    user && user.status === "approved" && (user.role === "player" || user.role === "admin")
  );

  return (
    <section className="card">
      <h2>Team Calendar</h2>
      <p>
        {canViewPrivate
          ? `Viewing as ${user?.role}. Private logistics are visible.`
          : "Public mode: only non-sensitive event details are visible."}
      </p>
      <div className="stack">
        {events.map((event) => (
          <article key={event.id} className="event-card">
            <h3>{event.title}</h3>
            <p>{new Date(event.date).toLocaleString()}</p>
            <p>{event.publicDetails}</p>
            {canViewPrivate ? (
              <p className="private-detail">Private: {event.privateDetails}</p>
            ) : (
              <p className="private-detail muted">Private details hidden.</p>
            )}
            {event.isPlayerOnly && <span className="badge">Player Event</span>}
          </article>
        ))}
      </div>
    </section>
  );
}
