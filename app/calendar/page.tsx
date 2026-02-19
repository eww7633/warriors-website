import { getCalendarEventsForRole } from "@/lib/hq/events";
import { getCurrentUser } from "@/lib/hq/session";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  const role = user?.role ?? "public";
  const approved = Boolean(user && user.status === "approved");
  const canViewPrivate = Boolean(
    user && approved && (user.role === "player" || user.role === "admin")
  );

  const calendarEvents = await getCalendarEventsForRole(role, approved);

  return (
    <section className="card">
      <h2>Team Calendar</h2>
      <p>
        {canViewPrivate
          ? `Viewing as ${user?.role}. Private logistics are visible.`
          : "Public mode: only non-sensitive event details are visible."}
      </p>
      <div className="stack">
        {calendarEvents.map((event) => (
          <article key={event.id} className="event-card">
            <h3>{event.title}</h3>
            <p>{new Date(event.date).toLocaleString()}</p>
            <p>{event.publicDetails}</p>
            {event.locationPublic && <p>Location: {event.locationPublic}</p>}
            {canViewPrivate ? (
              <>
                <p className="private-detail">Private: {event.privateDetails || "-"}</p>
                {event.locationPrivate && <p className="private-detail">Private location: {event.locationPrivate}</p>}
              </>
            ) : (
              <p className="private-detail muted">Private details hidden.</p>
            )}
            {event.visibility !== "public" && <span className="badge">Player Event</span>}
          </article>
        ))}
      </div>
    </section>
  );
}
