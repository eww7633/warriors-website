import { getCalendarEventsForRole } from "@/lib/hq/events";
import { getCurrentUser } from "@/lib/hq/session";
import { listReservationBoards } from "@/lib/hq/reservations";

export default async function CalendarPage({
  searchParams
}: {
  searchParams?: { reservation?: string; error?: string };
}) {
  const query = searchParams ?? {};
  const user = await getCurrentUser();
  const role = user?.role ?? "public";
  const approved = Boolean(user && user.status === "approved");
  const canViewPrivate = Boolean(
    user && approved && (user.role === "player" || user.role === "admin")
  );

  const calendarEvents = await getCalendarEventsForRole(role, approved);
  const reservationBoards = await listReservationBoards(
    calendarEvents.map((event) => event.id),
    user?.id
  );

  return (
    <section className="card stack">
      <h2>Team Calendar</h2>
      <p>
        {canViewPrivate
          ? `Viewing as ${user?.role}. Private logistics are visible.`
          : "Public mode: only non-sensitive event details are visible."}
      </p>
      {query.reservation === "saved" && <p className="badge">Reservation updated.</p>}
      {query.error && <p className="muted">{query.error.replaceAll("_", " ")}</p>}
      <div className="stack">
        {calendarEvents.map((event) => (
          <details key={event.id} className="event-card admin-disclosure" open={false}>
            <summary>
              {event.title} | {new Date(event.date).toLocaleString()}
            </summary>
            <div className="stack calendar-event-expanded">
              <p>{event.publicDetails}</p>
              {event.locationPublic && <p>Location: {event.locationPublic}</p>}
              {event.locationPublic && (
                <p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      event.locationPublic
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Google Maps
                  </a>
                </p>
              )}
              {event.locationPublic && (
                <iframe
                  title={`Map for ${event.title}`}
                  loading="lazy"
                  className="event-map"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(
                    event.locationPublic
                  )}&output=embed`}
                />
              )}
              {canViewPrivate ? (
                <>
                  <p className="private-detail">Private: {event.privateDetails || "-"}</p>
                  {event.locationPrivate && <p className="private-detail">Private location: {event.locationPrivate}</p>}
                </>
              ) : (
                <p className="private-detail muted">Private details hidden.</p>
              )}
              {event.visibility !== "public" && <span className="badge">Player Event</span>}

              {canViewPrivate && user && (
                <form className="grid-form" action="/api/events/reservation" method="post">
                  <input type="hidden" name="eventId" value={event.id} />
                  <label>
                    Your reservation
                    <select
                      name="status"
                      defaultValue={reservationBoards.viewerStatusByEvent[event.id] || "going"}
                    >
                      <option value="going">Going</option>
                      <option value="maybe">Maybe</option>
                      <option value="not_going">Not going</option>
                    </select>
                  </label>
                  <input name="note" placeholder="Optional note for coaches/admin" />
                  <button className="button" type="submit">Save Reservation</button>
                </form>
              )}

              {canViewPrivate && (
                <div className="stack">
                  <strong>Who is signed up</strong>
                  {(reservationBoards.byEvent[event.id] || []).length > 0 ? (
                    (reservationBoards.byEvent[event.id] || []).map((entry) => (
                      <div key={`${event.id}-${entry.userId}`} className="event-card">
                        <strong>{entry.fullName}</strong>
                        <p>Status: {entry.status.replaceAll("_", " ")}</p>
                        {entry.note && <p>Note: {entry.note}</p>}
                      </div>
                    ))
                  ) : (
                    <p className="muted">No reservations yet.</p>
                  )}
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
