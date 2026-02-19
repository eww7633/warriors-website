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
                {player.photos.length > 0 && (
                  <div className="stack">
                    <img
                      src={(player.photos.find((photo) => photo.isPrimary) || player.photos[0]).imageUrl}
                      alt={`${player.fullName} primary`}
                      style={{ maxWidth: "320px", width: "100%", height: "auto", borderRadius: "10px" }}
                    />
                    {player.photos.length > 1 && (
                      <div className="stack">
                        <p className="muted">Photo history</p>
                        {player.photos.slice(1).map((photo) => (
                          <div key={photo.id} className="event-card">
                            <img
                              src={photo.imageUrl}
                              alt={`${player.fullName} archive`}
                              style={{ maxWidth: "220px", width: "100%", height: "auto", borderRadius: "8px" }}
                            />
                            {photo.caption && <p>{photo.caption}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
