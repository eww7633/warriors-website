import { listPublicRosterProfiles } from "@/lib/hq/public-roster";

export const dynamic = "force-dynamic";

export default async function AboutRosterPage() {
  const roster = await listPublicRosterProfiles();

  return (
    <article className="card">
      <p className="eyebrow">Roster</p>
      <h2>Meet The Warriors</h2>
      <p className="muted">Public player profiles highlighting participation and program impact.</p>
      <div className="about-card-grid">
        {roster.map((player) => {
          const photo = player.photos.find((item) => item.isPrimary) || player.photos[0];
          return (
            <article key={player.id} className="event-card roster-card">
              {photo ? (
                <img
                  src={photo.imageUrl}
                  alt={`${player.fullName} profile`}
                  className="roster-card-image"
                />
              ) : null}
              <h3>{player.fullName}</h3>
              <p className="kicker">
                {player.position || "Player"}
                {player.jerseyNumber ? ` | #${player.jerseyNumber}` : ""}
              </p>
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
                  <span className="muted">Events</span>
                  <strong>{player.stats.eventsAttended}</strong>
                </div>
              </div>
            </article>
          );
        })}
        {roster.length === 0 ? <p className="muted">No public roster profiles available yet.</p> : null}
      </div>
    </article>
  );
}
