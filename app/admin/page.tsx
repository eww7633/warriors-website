import { resolveRole } from "@/lib/auth";
import { events, roster } from "@/lib/mockData";

type AdminPageProps = {
  searchParams: {
    role?: string;
  };
};

export default function AdminPage({ searchParams }: AdminPageProps) {
  const role = resolveRole(searchParams.role);

  if (role !== "admin") {
    return (
      <section className="card">
        <h2>Hockey Operations Dashboard</h2>
        <p>Admin access required. Append <code>?role=admin</code> for demo access.</p>
      </section>
    );
  }

  return (
    <section className="stack">
      <article className="card">
        <h2>Operations Dashboard</h2>
        <ul>
          <li>Open Registrations: 7</li>
          <li>Pending Medical Forms: 3</li>
          <li>Upcoming Events Requiring Staff Assignment: 2</li>
        </ul>
      </article>

      <article className="card">
        <h3>Roster Management</h3>
        <div className="stack">
          {roster.map((player) => (
            <div key={player.id} className="event-card">
              <strong>{player.name}</strong>
              <p>{player.position} | {player.status}</p>
              <p>Track: GP {player.gamesPlayed}, G {player.goals}, A {player.assists}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <h3>Event Administration</h3>
        <div className="stack">
          {events.map((event) => (
            <div key={event.id} className="event-card">
              <strong>{event.title}</strong>
              <p>{new Date(event.date).toLocaleString()}</p>
              <p>{event.privateDetails}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
