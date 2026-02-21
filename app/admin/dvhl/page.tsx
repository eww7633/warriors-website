import Link from "next/link";
import { redirect } from "next/navigation";
import { hasDatabaseUrl } from "@/lib/db-env";
import { listCompetitions, listEligiblePlayers } from "@/lib/hq/competitions";
import { getDvhlTeamControlMap } from "@/lib/hq/dvhl";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import { getCurrentUser } from "@/lib/hq/session";
import { listSportsData } from "@/lib/hq/ops-data";

export const dynamic = "force-dynamic";

const tabs = [
  ["dashboard", "Dashboard"],
  ["seasons", "Seasons"],
  ["teams", "Teams"],
  ["schedule", "Schedule"],
  ["standings", "Standings"],
  ["stats", "Stats"],
  ["subs", "Sub Pool"]
] as const;

type Tab = (typeof tabs)[number][0];

type TeamRecord = {
  teamId: string;
  teamName: string;
  competitionId: string;
  competitionTitle: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

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

function toDateLabel(value?: string | Date | null) {
  if (!value) return "No date";
  return new Date(value).toLocaleString();
}

function buildStandings(competitions: Awaited<ReturnType<typeof listCompetitions>>) {
  const records = new Map<string, TeamRecord>();

  for (const competition of competitions) {
    const competitionRecords = new Map<string, TeamRecord>();
    const teamByName = new Map<string, string>();

    for (const team of competition.teams) {
      const key = `${competition.id}:${team.id}`;
      const seeded: TeamRecord = {
        teamId: team.id,
        teamName: team.name,
        competitionId: competition.id,
        competitionTitle: competition.title,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0
      };
      records.set(key, seeded);
      competitionRecords.set(team.id, seeded);
      teamByName.set(team.name, team.id);
    }

    for (const team of competition.teams) {
      for (const game of team.games) {
        if (!isFinalGame(game)) continue;

        const homeRecord = competitionRecords.get(team.id);
        if (!homeRecord) continue;

        const awayTeamId = teamByName.get(game.opponent || "");
        const awayRecord = awayTeamId ? competitionRecords.get(awayTeamId) : undefined;
        const gf = game.warriorsScore ?? 0;
        const ga = game.opponentScore ?? 0;

        homeRecord.gamesPlayed += 1;
        homeRecord.goalsFor += gf;
        homeRecord.goalsAgainst += ga;

        if (gf > ga) {
          homeRecord.wins += 1;
          homeRecord.points += 2;
        } else if (gf < ga) {
          homeRecord.losses += 1;
        } else {
          homeRecord.ties += 1;
          homeRecord.points += 1;
        }

        if (awayRecord) {
          awayRecord.gamesPlayed += 1;
          awayRecord.goalsFor += ga;
          awayRecord.goalsAgainst += gf;

          if (ga > gf) {
            awayRecord.wins += 1;
            awayRecord.points += 2;
          } else if (ga < gf) {
            awayRecord.losses += 1;
          } else {
            awayRecord.ties += 1;
            awayRecord.points += 1;
          }
        }
      }
    }
  }

  return Array.from(records.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return a.teamName.localeCompare(b.teamName);
  });
}

function defaultDvhlPairings(teamIds: string[]) {
  if (teamIds.length < 4) {
    return [];
  }
  const [t1, t2, t3, t4] = teamIds;
  return [
    { week: 1, game1: [t1, t2], game2: [t3, t4] },
    { week: 2, game1: [t1, t3], game2: [t2, t4] },
    { week: 3, game1: [t1, t4], game2: [t2, t3] },
    { week: 4, game1: [t1, t2], game2: [t3, t4] },
    { week: 5, game1: [t1, t3], game2: [t2, t4] },
    { week: 6, game1: [t1, t4], game2: [t2, t3] }
  ];
}

export default async function AdminDvhlPage({
  searchParams
}: {
  searchParams?: {
    tab?: string;
    teamId?: string;
    error?: string;
    competition?: string;
    assignment?: string;
    game?: string;
    scorekeeper?: string;
    dvhl?: string;
  };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?error=sign_in_required");
  }

  if (!(await canAccessAdminPanel(user))) {
    redirect("/player?error=admin_required");
  }

  const canManageDvhl =
    (await userHasPermission(user, "manage_dvhl")) ||
    (await userHasPermission(user, "manage_events"));

  if (!canManageDvhl) {
    redirect("/admin?error=dvhl_permission_required");
  }

  const tab = tabs.some(([key]) => key === searchParams?.tab)
    ? (searchParams?.tab as Tab)
    : "dashboard";

  const [competitions, eligiblePlayers, sportsData] = await Promise.all([
    listCompetitions(),
    listEligiblePlayers(),
    listSportsData()
  ]);

  const dvhlCompetitions = competitions.filter((competition) => competition.type === "DVHL");
  const dvhlTeams = dvhlCompetitions.flatMap((competition) =>
    competition.teams.map((team) => ({ team, competition }))
  );
  const teamIds = dvhlTeams.map((entry) => entry.team.id);
  const controlsByTeamId = await getDvhlTeamControlMap(teamIds);
  const standings = buildStandings(dvhlCompetitions);

  const selectedTeamId =
    dvhlTeams.find((entry) => entry.team.id === searchParams?.teamId)?.team.id || dvhlTeams[0]?.team.id;
  const selectedTeamBundle = dvhlTeams.find((entry) => entry.team.id === selectedTeamId);

  const statusMessages = [
    searchParams?.competition === "created" ? "DVHL season created." : null,
    searchParams?.dvhl === "team_created" ? "DVHL team created." : null,
    searchParams?.dvhl === "team_removed" ? "DVHL team removed." : null,
    searchParams?.dvhl === "captain_saved" ? "Captain saved." : null,
    searchParams?.dvhl === "subpool_saved" ? "Sub pool updated." : null,
    searchParams?.dvhl === "schedule_saved" ? "DVHL schedule saved." : null,
    searchParams?.assignment === "saved" ? "Player added to team." : null,
    searchParams?.assignment === "removed" ? "Player removed from team." : null,
    searchParams?.game === "created" ? "Game added to schedule." : null,
    searchParams?.scorekeeper === "saved" ? "Scorekeeper updated." : null
  ].filter(Boolean) as string[];

  const errorMessage = searchParams?.error ? searchParams.error.replaceAll("_", " ") : null;

  const totalGames = dvhlTeams.reduce((sum, entry) => sum + entry.team.games.length, 0);
  const totalRostered = dvhlTeams.reduce((sum, entry) => sum + entry.team.members.length, 0);
  const totalSubs = dvhlTeams.reduce(
    (sum, entry) => sum + (controlsByTeamId[entry.team.id]?.subPoolUserIds.length || 0),
    0
  );

  return (
    <section className="stack admin-shell">
      <article className="card hero-card admin-hero">
        <p className="eyebrow">Warrior HQ</p>
        <h2>DVHL Management Hub</h2>
        <p>Everything DVHL is managed here: seasons, teams, captains, players, schedule, standings, and sub pool.</p>
        <div className="admin-kpi-grid">
          <div className="admin-kpi"><span className="muted">DVHL seasons</span><strong>{dvhlCompetitions.length}</strong></div>
          <div className="admin-kpi"><span className="muted">Teams</span><strong>{dvhlTeams.length}</strong></div>
          <div className="admin-kpi"><span className="muted">Rostered slots</span><strong>{totalRostered}</strong></div>
          <div className="admin-kpi"><span className="muted">Scheduled games</span><strong>{totalGames}</strong></div>
          <div className="admin-kpi"><span className="muted">Sub pool spots</span><strong>{totalSubs}</strong></div>
        </div>
        {statusMessages.map((message) => (
          <p key={message} className="badge">{message}</p>
        ))}
        {errorMessage ? <p className="muted">{errorMessage}</p> : null}
      </article>

      <div className="admin-panel-layout">
        <aside className="card admin-side-nav-card">
          <h3>DVHL</h3>
          <nav className="admin-side-nav" aria-label="DVHL sections">
            {tabs.map(([key, label]) => (
              <Link key={key} href={`/admin/dvhl?tab=${key}`} className={`admin-side-link ${tab === key ? "active" : ""}`}>
                {label}
              </Link>
            ))}
            <Link href="/admin?section=events" className="admin-side-link">Events</Link>
            <Link href="/admin?section=players" className="admin-side-link">Players</Link>
          </nav>
        </aside>

        <div className="stack admin-panel-content">
          {!hasDatabaseUrl() ? (
            <article className="card">
              <h3>Database Mode Required</h3>
              <p className="muted">DVHL hub requires DATABASE_URL mode so teams, schedule, and standings persist.</p>
            </article>
          ) : null}

          {tab === "dashboard" && (
            <article className="card">
              <h3>DVHL Dashboard</h3>
              <p className="muted">Quick season snapshot with current leaders and setup status.</p>
              {standings.length === 0 ? (
                <p className="muted">No DVHL seasons yet. Start in the Seasons tab.</p>
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
                    {standings.slice(0, 10).map((record) => (
                      <tr key={record.teamId}>
                        <td>{record.teamName}</td>
                        <td>{record.competitionTitle}</td>
                        <td>{record.gamesPlayed}</td>
                        <td>{record.wins}</td>
                        <td>{record.losses}</td>
                        <td>{record.ties}</td>
                        <td>{record.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </article>
          )}

          {tab === "seasons" && (
            <div className="stack">
              <article className="card">
                <h3>Create DVHL Season / Session</h3>
                <form className="grid-form" action="/api/admin/competitions/dvhl" method="post">
                  <input type="hidden" name="returnTo" value="/admin/dvhl?tab=seasons" />
                  <input name="title" placeholder="DVHL 2026 Session 1" required />
                  <label>
                    Start date/time
                    <input name="startsAt" type="datetime-local" />
                  </label>
                  <input name="team1" placeholder="Team 1 name" required />
                  <input name="team2" placeholder="Team 2 name" required />
                  <input name="team3" placeholder="Team 3 name" required />
                  <input name="team4" placeholder="Team 4 name" required />
                  <input name="notes" placeholder="Notes" />
                  <button className="button" type="submit">Create DVHL Season</button>
                </form>
              </article>

              <article className="card">
                <h3>Existing DVHL Seasons</h3>
                {dvhlCompetitions.length === 0 ? (
                  <p className="muted">No DVHL seasons created yet.</p>
                ) : (
                  <div className="stack">
                    {dvhlCompetitions.map((competition) => (
                      <div key={competition.id} className="event-card">
                        <strong>{competition.title}</strong>
                        <p>{toDateLabel(competition.startsAt)}</p>
                        <p>Teams: {competition.teams.map((entry) => entry.name).join(", ") || "None"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </div>
          )}

          {tab === "teams" && (
            <div className="stack">
              <article className="card">
                <h3>Add Team To DVHL Season</h3>
                <form className="grid-form" action="/api/admin/competitions/dvhl-team" method="post">
                  <input type="hidden" name="returnTo" value="/admin/dvhl?tab=teams" />
                  <label>
                    Season
                    <select name="competitionId" defaultValue="" required>
                      <option value="" disabled>Select DVHL season</option>
                      {dvhlCompetitions.map((competition) => (
                        <option key={competition.id} value={competition.id}>{competition.title}</option>
                      ))}
                    </select>
                  </label>
                  <input name="name" placeholder="Team name" required />
                  <input name="colorTag" placeholder="Color tag (optional)" />
                  <button className="button" type="submit">Add Team</button>
                </form>
              </article>

              <article className="card">
                <h3>Team Management</h3>
                {dvhlTeams.length === 0 ? (
                  <p className="muted">No teams to manage yet.</p>
                ) : (
                  <div className="stack">
                    {dvhlTeams.map(({ competition, team }) => {
                      const control = controlsByTeamId[team.id];
                      return (
                        <details key={team.id} className="event-card admin-disclosure" open={selectedTeamId === team.id}>
                          <summary>{team.name} | {competition.title}</summary>
                          <p>Roster size: {team.members.length}</p>
                          <form className="grid-form" action="/api/admin/competitions/dvhl-captain" method="post">
                            <input type="hidden" name="returnTo" value="/admin/dvhl?tab=teams" />
                            <input type="hidden" name="teamId" value={team.id} />
                            <label>
                              Captain
                              <select name="captainUserId" defaultValue={control?.captainUserId || ""}>
                                <option value="">No captain selected</option>
                                {team.members.map((member) => (
                                  <option key={member.user.id} value={member.user.id}>{member.user.fullName}</option>
                                ))}
                              </select>
                            </label>
                            <button className="button ghost" type="submit">Save Captain</button>
                          </form>

                          <form className="grid-form" action="/api/admin/competitions/assign-player" method="post">
                            <input type="hidden" name="returnTo" value="/admin/dvhl?tab=teams" />
                            <input type="hidden" name="teamId" value={team.id} />
                            <label>
                              Add player
                              <select name="userId" defaultValue="" required>
                                <option value="" disabled>Select player</option>
                                {eligiblePlayers.map((player) => (
                                  <option key={player.id} value={player.id}>{player.fullName}</option>
                                ))}
                              </select>
                            </label>
                            <button className="button" type="submit">Add Player</button>
                          </form>

                          <strong>Team roster</strong>
                          {team.members.length === 0 ? (
                            <p className="muted">No players on roster yet.</p>
                          ) : (
                            <div className="stack">
                              {team.members.map((member) => (
                                <form key={member.user.id} className="cta-row" action="/api/admin/competitions/remove-player" method="post">
                                  <input type="hidden" name="returnTo" value="/admin/dvhl?tab=teams" />
                                  <input type="hidden" name="teamId" value={team.id} />
                                  <input type="hidden" name="userId" value={member.user.id} />
                                  <span>{member.user.fullName}</span>
                                  <button className="button alt" type="submit">Remove</button>
                                </form>
                              ))}
                            </div>
                          )}

                          <form action="/api/admin/competitions/dvhl-team-delete" method="post">
                            <input type="hidden" name="returnTo" value="/admin/dvhl?tab=teams" />
                            <input type="hidden" name="teamId" value={team.id} />
                            <button className="button alt" type="submit">Delete Team</button>
                          </form>

                          <p>
                            <Link href={`/admin/dvhl?tab=teams&teamId=${team.id}`}>Open team roster page</Link>
                          </p>
                        </details>
                      );
                    })}
                  </div>
                )}
              </article>

              {selectedTeamBundle ? (
                <article className="card">
                  <h3>{selectedTeamBundle.team.name} Roster Page</h3>
                  <p className="muted">Season: {selectedTeamBundle.competition.title}</p>
                  <table>
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Email</th>
                        <th>Jersey</th>
                        <th>Roster ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTeamBundle.team.members.map((member) => (
                        <tr key={member.user.id}>
                          <td>{member.user.fullName}</td>
                          <td>{member.user.email}</td>
                          <td>{eligiblePlayers.find((entry) => entry.id === member.user.id)?.jerseyNumber ?? "-"}</td>
                          <td>{eligiblePlayers.find((entry) => entry.id === member.user.id)?.rosterId || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              ) : null}
            </div>
          )}

          {tab === "schedule" && (
            <div className="stack">
              {dvhlCompetitions.length === 0 ? (
                <article className="card"><p className="muted">Create a DVHL season first to build schedule.</p></article>
              ) : (
                dvhlCompetitions.map((competition) => {
                  const pairings = defaultDvhlPairings(competition.teams.map((team) => team.id));
                  const seedTeams = competition.teams.slice(0, 4);
                  const allGames = competition.teams
                    .flatMap((team) => team.games.map((game) => ({ game, homeTeam: team.name })))
                    .sort((a, b) => {
                      const left = a.game.startsAt ? new Date(a.game.startsAt).getTime() : 0;
                      const right = b.game.startsAt ? new Date(b.game.startsAt).getTime() : 0;
                      return left - right;
                    });
                  return (
                    <article key={competition.id} className="card">
                      <h3>{competition.title} Schedule Builder</h3>
                      <p className="muted">
                        Default rotation: 1v2 + 3v4, then 1v3 + 2v4, then 1v4 + 2v3, repeated for weeks 4-6.
                      </p>
                      {competition.teams.length >= 4 ? (
                        <details className="event-card admin-disclosure" open>
                          <summary>One-Click DVHL Schedule Preset</summary>
                          <p className="muted">
                            Fast path: generate standard DVHL pattern automatically. Then adjust anything below in weekly editor.
                          </p>
                          <form className="grid-form" action="/api/admin/competitions/dvhl-schedule" method="post">
                            <input type="hidden" name="mode" value="preset" />
                            <input type="hidden" name="competitionId" value={competition.id} />
                            <input type="hidden" name="returnTo" value="/admin/dvhl?tab=schedule" />
                            <input type="hidden" name="team1" value={seedTeams[0]?.id || ""} />
                            <input type="hidden" name="team2" value={seedTeams[1]?.id || ""} />
                            <input type="hidden" name="team3" value={seedTeams[2]?.id || ""} />
                            <input type="hidden" name="team4" value={seedTeams[3]?.id || ""} />
                            <label>
                              <input type="checkbox" name="clearExisting" defaultChecked /> Replace existing season schedule
                            </label>
                            <label>
                              Season cycles
                              <select name="cycleCount" defaultValue="2">
                                <option value="1">1 cycle (3 weeks)</option>
                                <option value="2">2 cycles (6 weeks)</option>
                                <option value="3">3 cycles (9 weeks)</option>
                                <option value="4">4 cycles (12 weeks)</option>
                              </select>
                            </label>
                            <label>
                              Week interval (days)
                              <input name="weekIntervalDays" type="number" min={1} max={21} defaultValue={7} />
                            </label>
                            <label>
                              First week game 1 date/time (optional)
                              <input name="baseStartsAt" type="datetime-local" />
                            </label>
                            <label>
                              Game gap (minutes)
                              <input name="gameGapMinutes" type="number" min={0} max={360} defaultValue={90} />
                            </label>
                            <input name="defaultLocation" placeholder="Default location (optional)" />
                            <button className="button" type="submit">Generate Preset Schedule</button>
                          </form>
                        </details>
                      ) : null}
                      {competition.teams.length < 4 ? (
                        <p className="muted">Add at least 4 teams to use the guided DVHL weekly builder.</p>
                      ) : (
                        <form className="grid-form" action="/api/admin/competitions/dvhl-schedule" method="post">
                          <input type="hidden" name="competitionId" value={competition.id} />
                          <input type="hidden" name="returnTo" value="/admin/dvhl?tab=schedule" />
                          <label><input type="checkbox" name="clearExisting" defaultChecked /> Replace existing season schedule</label>
                          {pairings.map((row) => (
                            <details key={`${competition.id}-week-${row.week}`} className="event-card admin-disclosure" open>
                              <summary>Week {row.week}</summary>
                              <div className="stack">
                                <strong>Game 1</strong>
                                <label>
                                  Home team
                                  <select name={`w${row.week}g1Home`} defaultValue={row.game1[0]}>
                                    <option value="">No game</option>
                                    {competition.teams.map((team) => (
                                      <option key={`${team.id}-w${row.week}g1home`} value={team.id}>{team.name}</option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  Away team
                                  <select name={`w${row.week}g1Away`} defaultValue={row.game1[1]}>
                                    <option value="">No game</option>
                                    {competition.teams.map((team) => (
                                      <option key={`${team.id}-w${row.week}g1away`} value={team.id}>{team.name}</option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  Date/time (optional)
                                  <input name={`w${row.week}g1StartsAt`} type="datetime-local" />
                                </label>
                                <input name={`w${row.week}g1Location`} placeholder="Location (optional)" />

                                <strong>Game 2</strong>
                                <label>
                                  Home team
                                  <select name={`w${row.week}g2Home`} defaultValue={row.game2[0]}>
                                    <option value="">No game</option>
                                    {competition.teams.map((team) => (
                                      <option key={`${team.id}-w${row.week}g2home`} value={team.id}>{team.name}</option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  Away team
                                  <select name={`w${row.week}g2Away`} defaultValue={row.game2[1]}>
                                    <option value="">No game</option>
                                    {competition.teams.map((team) => (
                                      <option key={`${team.id}-w${row.week}g2away`} value={team.id}>{team.name}</option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  Date/time (optional)
                                  <input name={`w${row.week}g2StartsAt`} type="datetime-local" />
                                </label>
                                <input name={`w${row.week}g2Location`} placeholder="Location (optional)" />
                              </div>
                            </details>
                          ))}
                          <button className="button" type="submit">Save Weekly Schedule</button>
                        </form>
                      )}

                      <h4>Current Scheduled Games</h4>
                      <p>
                        <Link className="button ghost" href="/games">Open live scoring console</Link>
                      </p>
                      {allGames.length === 0 ? (
                        <p className="muted">No games scheduled yet.</p>
                      ) : (
                        <div className="stack">
                          {allGames.map(({ game, homeTeam }) => (
                            <form key={game.id} className="event-card grid-form" action="/api/admin/competitions/assign-scorekeeper" method="post">
                              <input type="hidden" name="returnTo" value="/admin/dvhl?tab=schedule" />
                              <input type="hidden" name="gameId" value={game.id} />
                              <strong>{homeTeam} vs {game.opponent}</strong>
                              <p>{toDateLabel(game.startsAt)} | {game.location || "No location"}</p>
                              <p>Score: {game.warriorsScore} - {game.opponentScore} | {game.liveStatus}</p>
                              <label>
                                Scorekeeper type
                                <select name="scorekeeperType" defaultValue={game.scorekeeperUser ? "player" : game.scorekeeperStaff ? "staff" : "none"}>
                                  <option value="none">None</option>
                                  <option value="player">Player/Admin</option>
                                  <option value="staff">Staff</option>
                                </select>
                              </label>
                              <label>
                                Player/Admin
                                <select name="scorekeeperUserId" defaultValue={game.scorekeeperUser?.id || ""}>
                                  <option value="">No assignment</option>
                                  {eligiblePlayers.map((player) => (
                                    <option key={player.id} value={player.id}>{player.fullName}</option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Staff
                                <select name="scorekeeperStaffId" defaultValue={game.scorekeeperStaff?.id || ""}>
                                  <option value="">No assignment</option>
                                  {sportsData.staff.map((staff) => (
                                    <option key={staff.id} value={staff.id}>{staff.fullName}</option>
                                  ))}
                                </select>
                              </label>
                              <button className="button ghost" type="submit">Save Scorekeeper</button>
                            </form>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          )}

          {tab === "standings" && (
            <article className="card">
              <h3>Standings</h3>
              {standings.length === 0 ? (
                <p className="muted">No completed DVHL games yet.</p>
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
                      <th>GF</th>
                      <th>GA</th>
                      <th>PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((record) => (
                      <tr key={`${record.competitionId}-${record.teamId}`}>
                        <td>{record.teamName}</td>
                        <td>{record.competitionTitle}</td>
                        <td>{record.gamesPlayed}</td>
                        <td>{record.wins}</td>
                        <td>{record.losses}</td>
                        <td>{record.ties}</td>
                        <td>{record.goalsFor}</td>
                        <td>{record.goalsAgainst}</td>
                        <td>{record.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </article>
          )}

          {tab === "stats" && (
            <article className="card">
              <h3>DVHL Team Stats</h3>
              {dvhlTeams.length === 0 ? (
                <p className="muted">No DVHL teams available.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Season</th>
                      <th>Players</th>
                      <th>Games</th>
                      <th>Tracked Events</th>
                      <th>Captains</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dvhlTeams.map(({ competition, team }) => (
                      <tr key={team.id}>
                        <td>{team.name}</td>
                        <td>{competition.title}</td>
                        <td>{team.members.length}</td>
                        <td>{team.games.length}</td>
                        <td>{team.games.reduce((sum, game) => sum + game.events.length, 0)}</td>
                        <td>{controlsByTeamId[team.id]?.captainUserId ? 1 : 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </article>
          )}

          {tab === "subs" && (
            <div className="stack">
              {dvhlTeams.map(({ competition, team }) => {
                const subIds = controlsByTeamId[team.id]?.subPoolUserIds || [];
                return (
                  <article key={team.id} className="card">
                    <h3>{team.name} Sub Pool</h3>
                    <p className="muted">{competition.title}</p>
                    <form className="grid-form" action="/api/admin/competitions/dvhl-sub-pool" method="post">
                      <input type="hidden" name="returnTo" value="/admin/dvhl?tab=subs" />
                      <input type="hidden" name="teamId" value={team.id} />
                      <input type="hidden" name="action" value="add" />
                      <label>
                        Add sub volunteer
                        <select name="userId" defaultValue="" required>
                          <option value="" disabled>Select player</option>
                          {eligiblePlayers.map((player) => (
                            <option key={player.id} value={player.id}>{player.fullName}</option>
                          ))}
                        </select>
                      </label>
                      <button className="button" type="submit">Add Sub</button>
                    </form>
                    {subIds.length === 0 ? (
                      <p className="muted">No subs assigned.</p>
                    ) : (
                      <div className="stack">
                        {subIds.map((userId) => {
                          const player = eligiblePlayers.find((entry) => entry.id === userId);
                          return (
                            <form key={`${team.id}-${userId}`} className="cta-row" action="/api/admin/competitions/dvhl-sub-pool" method="post">
                              <input type="hidden" name="returnTo" value="/admin/dvhl?tab=subs" />
                              <input type="hidden" name="teamId" value={team.id} />
                              <input type="hidden" name="userId" value={userId} />
                              <input type="hidden" name="action" value="remove" />
                              <span>{player?.fullName || userId}</span>
                              <button className="button alt" type="submit">Remove</button>
                            </form>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
