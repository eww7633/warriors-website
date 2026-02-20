import Link from "next/link";
import { redirect } from "next/navigation";
import { listCompetitions } from "@/lib/hq/competitions";
import { getDvhlTeamControlMap } from "@/lib/hq/dvhl";
import { getCurrentUser } from "@/lib/hq/session";

export const dynamic = "force-dynamic";

const tabs = [
  ["dashboard", "Dashboard"],
  ["teams", "My Teams"],
  ["schedule", "Schedule"],
  ["standings", "Standings"],
  ["subs", "Sub Pool"]
] as const;

type Tab = (typeof tabs)[number][0];

function toDateLabel(value?: string | Date | null) {
  if (!value) return "No date";
  return new Date(value).toLocaleString();
}

function isFinalGame(game: {
  status?: string | null;
  liveStatus?: string | null;
  warriorsScore?: number | null;
  opponentScore?: number | null;
}) {
  const status = `${game.status || ""} ${game.liveStatus || ""}`.toLowerCase();
  if (status.includes("final") || status.includes("complete")) return true;
  return typeof game.warriorsScore === "number" && typeof game.opponentScore === "number";
}

export default async function PlayerDvhlPage({
  searchParams
}: {
  searchParams?: { tab?: string; dvhl?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?error=sign_in_required");
  }

  if ((user.role !== "player" && user.role !== "admin") || user.status !== "approved") {
    redirect("/player?error=player_approval_required");
  }

  const tab = tabs.some(([key]) => key === searchParams?.tab)
    ? (searchParams?.tab as Tab)
    : "dashboard";

  const competitions = await listCompetitions();
  const dvhlCompetitions = competitions.filter((competition) => competition.type === "DVHL");
  const dvhlTeams = dvhlCompetitions.flatMap((competition) =>
    competition.teams.map((team) => ({ competition, team }))
  );
  const controlsByTeamId = await getDvhlTeamControlMap(dvhlTeams.map((entry) => entry.team.id));

  const myTeams = dvhlTeams.filter((entry) =>
    entry.team.members.some((member) => member.user.id === user.id)
  );
  const myTeamIds = new Set(myTeams.map((entry) => entry.team.id));
  const myUpcomingGames = dvhlCompetitions
    .flatMap((competition) =>
      competition.teams.flatMap((team) =>
        team.games
          .filter((game) => {
            const isHomeTeam = myTeamIds.has(team.id);
            const isAwayTeam = myTeams.some((entry) => entry.team.name === game.opponent);
            return isHomeTeam || isAwayTeam;
          })
          .map((game) => ({ game, teamName: team.name, seasonTitle: competition.title }))
      )
    )
    .filter((entry, index, list) => list.findIndex((candidate) => candidate.game.id === entry.game.id) === index)
    .sort((a, b) => {
      const left = a.game.startsAt ? new Date(a.game.startsAt).getTime() : 0;
      const right = b.game.startsAt ? new Date(b.game.startsAt).getTime() : 0;
      return left - right;
    });

  const standings = dvhlCompetitions
    .flatMap((competition) => {
      const records = competition.teams.map((team) => ({
        id: team.id,
        teamName: team.name,
        competitionTitle: competition.title,
        gp: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        gf: 0,
        ga: 0,
        points: 0
      }));
      const recordByTeamId = new Map(records.map((entry) => [entry.id, entry]));
      const teamIdByName = new Map(competition.teams.map((team) => [team.name, team.id]));

      for (const team of competition.teams) {
        for (const game of team.games) {
          if (!isFinalGame(game)) continue;

          const home = recordByTeamId.get(team.id);
          if (!home) continue;

          const awayId = teamIdByName.get(game.opponent || "");
          const away = awayId ? recordByTeamId.get(awayId) : undefined;
          const gf = game.warriorsScore ?? 0;
          const ga = game.opponentScore ?? 0;

          home.gp += 1;
          home.gf += gf;
          home.ga += ga;
          if (gf > ga) {
            home.wins += 1;
            home.points += 2;
          } else if (gf < ga) {
            home.losses += 1;
          } else {
            home.ties += 1;
            home.points += 1;
          }

          if (away) {
            away.gp += 1;
            away.gf += ga;
            away.ga += gf;
            if (ga > gf) {
              away.wins += 1;
              away.points += 2;
            } else if (ga < gf) {
              away.losses += 1;
            } else {
              away.ties += 1;
              away.points += 1;
            }
          }
        }
      }

      return records;
    })
    .sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));

  const statusMessages = [
    searchParams?.dvhl === "subpool_saved" ? "DVHL sub pool preference updated." : null
  ].filter(Boolean) as string[];

  const errorMessage = searchParams?.error ? searchParams.error.replaceAll("_", " ") : null;

  return (
    <section className="stack admin-shell">
      <article className="card hero-card admin-hero">
        <p className="eyebrow">Player Hub</p>
        <h2>DVHL</h2>
        <p>Track your DVHL teams, schedule, standings, and sub-volunteer status in one place.</p>
        {statusMessages.map((message) => (
          <p className="badge" key={message}>{message}</p>
        ))}
        {errorMessage ? <p className="muted">{errorMessage}</p> : null}
      </article>

      <div className="admin-panel-layout">
        <aside className="card admin-side-nav-card">
          <h3>DVHL</h3>
          <nav className="admin-side-nav" aria-label="DVHL player sections">
            {tabs.map(([key, label]) => (
              <Link key={key} href={`/player/dvhl?tab=${key}`} className={`admin-side-link ${tab === key ? "active" : ""}`}>
                {label}
              </Link>
            ))}
            <Link href="/player?section=events" className="admin-side-link">All Events</Link>
            <Link href="/player" className="admin-side-link">Player Hub Home</Link>
          </nav>
        </aside>

        <div className="stack admin-panel-content">
          {tab === "dashboard" && (
            <article className="card">
              <h3>My DVHL Snapshot</h3>
              <div className="admin-kpi-grid">
                <div className="admin-kpi"><span className="muted">My teams</span><strong>{myTeams.length}</strong></div>
                <div className="admin-kpi"><span className="muted">Upcoming games</span><strong>{myUpcomingGames.length}</strong></div>
                <div className="admin-kpi"><span className="muted">Leagues active</span><strong>{dvhlCompetitions.length}</strong></div>
              </div>
              {myTeams.length === 0 ? (
                <p className="muted">You are not assigned to a DVHL team yet.</p>
              ) : null}
            </article>
          )}

          {tab === "teams" && (
            <article className="card">
              <h3>My Teams</h3>
              {myTeams.length === 0 ? (
                <p className="muted">No DVHL team assignments yet.</p>
              ) : (
                <div className="stack">
                  {myTeams.map(({ competition, team }) => {
                    const control = controlsByTeamId[team.id];
                    const captain = team.members.find((member) => member.user.id === control?.captainUserId)?.user.fullName;
                    return (
                      <div key={team.id} className="event-card">
                        <strong>{team.name}</strong>
                        <p>{competition.title}</p>
                        <p>Captain: {captain || "Not assigned"}</p>
                        <p>Roster size: {team.members.length}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          )}

          {tab === "schedule" && (
            <article className="card">
              <h3>Schedule</h3>
              {myUpcomingGames.length === 0 ? (
                <p className="muted">No scheduled DVHL games yet.</p>
              ) : (
                <div className="stack">
                  {myUpcomingGames.map(({ game, teamName, seasonTitle }) => (
                    <div key={game.id} className="event-card">
                      <strong>{teamName} vs {game.opponent}</strong>
                      <p>{seasonTitle}</p>
                      <p>{toDateLabel(game.startsAt)}</p>
                      <p>{game.location || "No location set"}</p>
                      <p>Status: {game.liveStatus}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )}

          {tab === "standings" && (
            <article className="card">
              <h3>Standings</h3>
              {standings.length === 0 ? (
                <p className="muted">No standings yet.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Season</th>
                      <th>GP</th>
                      <th>W</th>
                      <th>L</th>
                      <th>T</th>
                      <th>PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.teamName}{myTeamIds.has(entry.id) ? " (You)" : ""}</td>
                        <td>{entry.competitionTitle}</td>
                        <td>{entry.gp}</td>
                        <td>{entry.wins}</td>
                        <td>{entry.losses}</td>
                        <td>{entry.ties}</td>
                        <td>{entry.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </article>
          )}

          {tab === "subs" && (
            <article className="card">
              <h3>Volunteer As Sub</h3>
              <p className="muted">Use this to add or remove yourself from DVHL team sub pools.</p>
              <div className="stack">
                {dvhlTeams.map(({ competition, team }) => {
                  const subIds = controlsByTeamId[team.id]?.subPoolUserIds || [];
                  const isInSubPool = subIds.includes(user.id);
                  return (
                    <form key={team.id} className="event-card cta-row" action="/api/player/dvhl/sub-pool" method="post">
                      <input type="hidden" name="returnTo" value="/player/dvhl?tab=subs" />
                      <input type="hidden" name="teamId" value={team.id} />
                      <input type="hidden" name="action" value={isInSubPool ? "remove" : "add"} />
                      <span>
                        <strong>{team.name}</strong> ({competition.title})
                        <br />
                        <span className="muted">Subs: {subIds.length}</span>
                      </span>
                      <button className={`button ${isInSubPool ? "alt" : "ghost"}`} type="submit">
                        {isInSubPool ? "Leave Sub Pool" : "Volunteer As Sub"}
                      </button>
                    </form>
                  );
                })}
              </div>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
