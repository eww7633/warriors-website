import { getCalendarEventsForRole, listActiveCheckInTokens } from "@/lib/hq/events";
import { getCurrentUser } from "@/lib/hq/session";
import { listReservationBoards } from "@/lib/hq/reservations";

function mapSearchUrl(query?: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || "")}`;
}

function mapEmbedUrl(query?: string, mapUrl?: string) {
  if (mapUrl && mapUrl.includes("/maps/embed")) {
    return mapUrl;
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(query || "")}&output=embed`;
}

export default async function CalendarPage({
  searchParams
}: {
  searchParams?: { reservation?: string; error?: string; qr?: string; event?: string };
}) {
  const query = searchParams ?? {};
  const selectedEventId = (query.event || "").trim();
  const user = await getCurrentUser();
  const role = user?.role ?? "public";
  const approved = Boolean(user && user.status === "approved");
  const canViewPrivate = Boolean(
    user && approved && (user.role === "player" || user.role === "admin")
  );

  const calendarEvents = await getCalendarEventsForRole(role, approved);
  const eventIds = calendarEvents.map((event) => event.id);
  const [reservationBoards, checkInTokens] = await Promise.all([
    listReservationBoards(eventIds, user?.id),
    listActiveCheckInTokens(eventIds)
  ]);

  return (
    <section className="card stack">
      <h2>Team Calendar</h2>
      <p>
        {canViewPrivate
          ? `Viewing as ${user?.role}. Private logistics are visible.`
          : "Public mode: only non-sensitive event details are visible."}
      </p>
      {query.reservation === "saved" && <p className="badge">Reservation updated.</p>}
      {query.qr === "generated" && <p className="badge">QR check-in code generated.</p>}
      {query.error && <p className="muted">{query.error.replaceAll("_", " ")}</p>}
      <div className="stack">
        {calendarEvents.map((event) => (
          <details
            key={event.id}
            id={`event-${event.id}`}
            className="event-card admin-disclosure"
            open={selectedEventId === event.id}
          >
            <summary>
              {event.title} | {new Date(event.date).toLocaleString()}
            </summary>
            <div className="stack calendar-event-expanded">
              <p>Type: {event.eventTypeName || "Uncategorized"}</p>
              {event.managerName && <p>Game manager: {event.managerName}</p>}
              <p>{event.publicDetails}</p>
              {event.locationPublic && <p>Location: {event.locationPublic}</p>}
              {(event.locationPublicMapUrl || event.locationPublic) && (
                <p>
                  <a
                    href={
                      event.locationPublicMapUrl || mapSearchUrl(event.locationPublic)
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Google Maps
                  </a>
                </p>
              )}
              {(event.locationPublicMapUrl || event.locationPublic) && (
                <iframe
                  title={`Map for ${event.title}`}
                  loading="lazy"
                  className="event-map"
                  src={
                    mapEmbedUrl(event.locationPublic, event.locationPublicMapUrl)
                  }
                />
              )}
              {canViewPrivate ? (
                <>
                  <p className="private-detail">Private: {event.privateDetails || "-"}</p>
                  {event.locationPrivate && <p className="private-detail">Private location: {event.locationPrivate}</p>}
                  {(event.locationPrivateMapUrl || event.locationPrivate) && (
                    <p className="private-detail">
                      <a
                        href={
                          event.locationPrivateMapUrl || mapSearchUrl(event.locationPrivate)
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open private map
                      </a>
                    </p>
                  )}
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
                  {user && (user.role === "admin" || event.managerUserId === user.id) && (
                    <div className="event-card stack">
                      <strong>Game Manager QR</strong>
                      <form className="grid-form" action="/api/events/checkin-token" method="post">
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="returnTo" value="/calendar" />
                        <button className="button" type="submit">Generate or Refresh QR</button>
                      </form>
                      {checkInTokens[event.id] ? (
                        <>
                          <p>Expires: {new Date(checkInTokens[event.id]!.expiresAt).toLocaleString()}</p>
                          <img
                            src={`/api/events/checkin-qr?token=${encodeURIComponent(checkInTokens[event.id]!.token)}`}
                            alt={`QR check-in for ${event.title}`}
                            style={{ maxWidth: "260px", width: "100%", height: "auto" }}
                          />
                          <p>
                            Scan URL:{" "}
                            <a href={`/check-in/scan?token=${encodeURIComponent(checkInTokens[event.id]!.token)}`}>
                              Open check-in page
                            </a>
                          </p>
                        </>
                      ) : (
                        <p className="muted">No active QR token yet.</p>
                      )}
                    </div>
                  )}
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
