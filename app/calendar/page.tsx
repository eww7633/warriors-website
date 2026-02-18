import { events } from "@/lib/mockData";
import { isPrivileged, resolveRole } from "@/lib/auth";

type CalendarPageProps = {
  searchParams: {
    role?: string;
  };
};

export default function CalendarPage({ searchParams }: CalendarPageProps) {
  const role = resolveRole(searchParams.role);
  const privileged = isPrivileged(role);

  return (
    <section className="card">
      <h2>Team Calendar</h2>
      <p>
        Viewing as <strong>{role}</strong>. Public visitors only see non-sensitive event details.
      </p>
      <div className="stack">
        {events.map((event) => (
          <article key={event.id} className="event-card">
            <h3>{event.title}</h3>
            <p>{new Date(event.date).toLocaleString()}</p>
            <p>{event.publicDetails}</p>
            {privileged ? (
              <p className="private-detail">Private: {event.privateDetails}</p>
            ) : (
              <p className="private-detail muted">Private details hidden. Sign in as a player.</p>
            )}
            {event.isPlayerOnly && <span className="badge">Player Event</span>}
          </article>
        ))}
      </div>
    </section>
  );
}
