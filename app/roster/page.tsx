import { listPublicRosterProfiles } from "@/lib/hq/public-roster";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const roster = await listPublicRosterProfiles();

  return (
    <section className="stack">
      <article className="card hero-card">
        <p className="eyebrow">Public Roster</p>
        <h2>Pittsburgh Warriors Player Profiles</h2>
        <p>Click a player card to view public profile details, jersey card, and participation stats.</p>
      </article>

      <article className="card">
        <div className="stack">
          {roster.map((player) => (
            <details key={player.id} className="event-card admin-disclosure">
              <summary>
                {player.fullName} {player.jerseyNumber ? `| #${player.jerseyNumber}` : ""} {player.status === "inactive" ? "(Inactive)" : ""}
              </summary>
              <div className="stack">
                <div className="jersey-render">
                  <div className="jersey-render-inner">
                    <span className="jersey-number">{player.jerseyNumber ?? "--"}</span>
                    <span className="jersey-name">{player.fullName}</span>
                  </div>
                </div>
                <p>Position: {player.position || "-"}</p>
                <p>Roster Group: {player.rosterId || "-"}</p>
                <p>Status: {player.status}</p>
                <div className="admin-kpi-grid">
                  <div className="admin-kpi">
                    <span className="muted">Tournaments</span>
                    <strong>{player.stats.tournamentsPlayed}</strong>
                  </div>
                  <div className="admin-kpi">
                    <span className="muted">Teams</span>
                    <strong>{player.stats.teamsPlayedOn}</strong>
                  </div>
                  <div className="admin-kpi">
                    <span className="muted">Events attended</span>
                    <strong>{player.stats.eventsAttended}</strong>
                  </div>
                </div>
              </div>
            </details>
          ))}
          {roster.length === 0 && <p className="muted">No public roster profiles yet.</p>}
        </div>
      </article>
    </section>
  );
}
