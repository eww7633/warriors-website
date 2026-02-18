import { games, rosters, seasons } from "@/lib/mockData";

function statusLabel(status: string) {
  if (status === "live") return "LIVE";
  if (status === "final") return "FINAL";
  return "SCHEDULED";
}

export default function GamesPage() {
  return (
    <section className="card">
      <h2>Live Game Tracking</h2>
      <p>Live scores, season context, and game logs modeled after your SportsPress workflow.</p>
      <div className="stack">
        {games.map((game) => {
          const season = seasons.find((s) => s.id === game.seasonId);
          const roster = rosters.find((r) => r.id === game.rosterId);

          return (
            <article key={game.id} className="event-card">
              <p className="kicker">{statusLabel(game.status)}</p>
              <h3>Warriors vs {game.opponent}</h3>
              <p>{new Date(game.startsAt).toLocaleString()} | {game.location}</p>
              <p><strong>{game.warriorsScore} - {game.opponentScore}</strong></p>
              <p>{season?.label} | {roster?.name}</p>
              {game.events.length > 0 ? (
                <ul>
                  {game.events.map((event, index) => (
                    <li key={`${game.id}-${index}`}>
                      {event.time} | {event.team} | {event.type} | {event.note}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No live events yet.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
