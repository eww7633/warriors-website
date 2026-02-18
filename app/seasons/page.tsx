import { roster, rosters, seasons } from "@/lib/mockData";

export default function SeasonsPage() {
  return (
    <section className="stack">
      <article className="card">
        <h2>Seasons and Rosters</h2>
        <p>Manage multiple rosters across active and archived seasons.</p>
      </article>

      {seasons.map((season) => {
        const seasonRosters = rosters.filter((entry) => entry.seasonId === season.id);
        return (
          <article key={season.id} className="card">
            <h3>{season.label} {season.isActive ? "(Active)" : ""}</h3>
            <p>Program: {season.level}</p>
            <div className="stack">
              {seasonRosters.map((teamRoster) => (
                <div key={teamRoster.id} className="event-card">
                  <strong>{teamRoster.name}</strong>
                  <p>{teamRoster.division}</p>
                  <p>
                    Players: {teamRoster.playerIds
                      .map((id) => roster.find((player) => player.id === id)?.name)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              ))}
              {seasonRosters.length === 0 && <p className="muted">No rosters configured.</p>}
            </div>
          </article>
        );
      })}
    </section>
  );
}
