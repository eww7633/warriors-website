import Link from "next/link";
import { redirect } from "next/navigation";
import { listCompetitions } from "@/lib/hq/competitions";
import { getDvhlTeamControlMap } from "@/lib/hq/dvhl";
import { listLiveGames } from "@/lib/hq/live-games";
import {
  getDvhlSkillRatingByUser,
  listDvhlSkillLevels
} from "@/lib/hq/dvhl-skill-ratings";
import {
  getDvhlDraftSession,
  getDvhlPlanPhase,
  getDvhlSeasonPlan,
  listDvhlSignupIntents,
  listDvhlSubRequests
} from "@/lib/hq/dvhl-workflows";
import { getCurrentUser } from "@/lib/hq/session";

export const dynamic = "force-dynamic";

const tabs = [
  ["dashboard", "Dashboard"],
  ["signup", "Season Signup"],
  ["teams", "My Teams"],
  ["schedule", "Schedule"],
  ["standings", "Standings"],
  ["subs", "Sub Pool"],
  ["self_rating", "Self Rating"],
  ["scoring", "Live Scoring"],
  ["captain", "Captain Tools"]
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
  searchParams?: { tab?: string; dvhl?: string; error?: string; errorDetail?: string };
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

  const [competitions, currentSkillRating, liveGames, subRequests] = await Promise.all([
    listCompetitions(),
    getDvhlSkillRatingByUser(user.id),
    listLiveGames(),
    listDvhlSubRequests()
  ]);
  const skillLevels = listDvhlSkillLevels();
  const myScoringGames = liveGames.filter(
    (game) => game.scorekeeperUserId === user.id || user.role === "admin"
  );
  const dvhlCompetitions = competitions.filter((competition) => competition.type === "DVHL");
  const dvhlTeams = dvhlCompetitions.flatMap((competition) =>
    competition.teams.map((team) => ({ competition, team }))
  );
  const controlsByTeamId = await getDvhlTeamControlMap(dvhlTeams.map((entry) => entry.team.id));
  const myCaptainTeamIds = dvhlTeams
    .filter((entry) => controlsByTeamId[entry.team.id]?.captainUserId === user.id)
    .map((entry) => entry.team.id);
  const myCaptainTeams = dvhlTeams.filter((entry) => myCaptainTeamIds.includes(entry.team.id));
  const draftSessions = await Promise.all(
    dvhlCompetitions.map(async (competition) => ({
      competitionId: competition.id,
      draft: await getDvhlDraftSession(competition.id)
    }))
  );
  const seasonPlans = await Promise.all(
    dvhlCompetitions.map(async (competition) => ({
      competitionId: competition.id,
      plan: await getDvhlSeasonPlan(competition.id),
      signups: await listDvhlSignupIntents(competition.id)
    }))
  );

  const myTeams = dvhlTeams.filter((entry) =>
    entry.team.members.some((member) => member.user.id === user.id)
  );
  const myTeamIds = new Set(myTeams.map((entry) => entry.team.id));
  const dvhlPlayersById = new Map(
    dvhlTeams
      .flatMap((entry) => entry.team.members.map((member) => [member.user.id, member.user.fullName] as const))
  );
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
    searchParams?.dvhl === "subpool_saved" ? "DVHL sub pool preference updated." : null,
    searchParams?.dvhl === "rating_saved" ? "DVHL self rating saved." : null,
    searchParams?.dvhl === "sub_request_created" ? "Sub request posted." : null,
    searchParams?.dvhl === "sub_request_accepted" ? "Sub request accepted." : null,
    searchParams?.dvhl === "sub_request_cancelled" ? "Sub request cancelled." : null,
    searchParams?.dvhl === "draft_pick_saved" ? "Draft pick saved." : null
    ,
    searchParams?.dvhl === "signup_saved" ? "DVHL signup saved." : null
  ].filter(Boolean) as string[];

  const errorMessage = searchParams?.error
    ? searchParams.errorDetail
      ? decodeURIComponent(searchParams.errorDetail)
      : searchParams.error.replaceAll("_", " ")
    : null;

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
                <div className="admin-kpi"><span className="muted">Assigned scoring</span><strong>{myScoringGames.length}</strong></div>
              </div>
              {myTeams.length === 0 ? (
                <p className="muted">You are not assigned to a DVHL team yet.</p>
              ) : null}
              <div className="cta-row">
                <Link className="button ghost" href="/games">
                  Open Live Scoring Console
                </Link>
              </div>
            </article>
          )}

          {tab === "signup" && (
            <article className="card">
              <h3>DVHL Season Signup</h3>
              {dvhlCompetitions.length === 0 ? (
                <p className="muted">No DVHL seasons available yet.</p>
              ) : (
                <div className="stack">
                  {dvhlCompetitions.map((competition) => {
                    const planEntry = seasonPlans.find((entry) => entry.competitionId === competition.id);
                    const phase = getDvhlPlanPhase(planEntry?.plan);
                    const mySignup = (planEntry?.signups || []).find((entry) => entry.userId === user.id);
                    const signupClosed = Boolean(
                      planEntry?.plan?.signupClosesAt &&
                        new Date(planEntry.plan.signupClosesAt).getTime() <= Date.now()
                    );
                    const captainInterestClosed = Boolean(
                      planEntry?.plan?.captainSignupClosesAt &&
                        new Date(planEntry.plan.captainSignupClosesAt).getTime() <= Date.now()
                    );

                    return (
                      <div key={competition.id} className="event-card">
                        <strong>{competition.title}</strong>
                        <p>Phase: {phase.replaceAll("_", " ")}</p>
                        <p>
                          Signup closes: {planEntry?.plan?.signupClosesAt
                            ? new Date(planEntry.plan.signupClosesAt).toLocaleString()
                            : "Not set"}
                        </p>
                        <p>
                          Captain interest closes: {planEntry?.plan?.captainSignupClosesAt
                            ? new Date(planEntry.plan.captainSignupClosesAt).toLocaleString()
                            : "Not set"}
                        </p>
                        {mySignup ? (
                          <p className="badge">
                            You are signed up{mySignup.wantsCaptain ? " (captain interest on)" : ""}.
                          </p>
                        ) : null}
                        <form className="grid-form" action="/api/player/dvhl/signup-interest" method="post">
                          <input type="hidden" name="competitionId" value={competition.id} />
                          <input type="hidden" name="returnTo" value="/player/dvhl?tab=signup" />
                          {captainInterestClosed && mySignup?.wantsCaptain ? (
                            <input type="hidden" name="wantsCaptain" value="on" />
                          ) : null}
                          <label>
                            <input
                              name="wantsCaptain"
                              type="checkbox"
                              defaultChecked={Boolean(mySignup?.wantsCaptain)}
                              disabled={signupClosed || captainInterestClosed}
                            />{" "}
                            I want to volunteer as captain
                          </label>
                          <input
                            name="note"
                            placeholder="Notes for Hockey Ops (availability, constraints)"
                            defaultValue={mySignup?.note || ""}
                            disabled={signupClosed}
                          />
                          <button className="button" type="submit" disabled={signupClosed}>
                            {mySignup ? "Update signup" : "Sign up for season"}
                          </button>
                          {signupClosed ? <p className="muted">Signup window is closed.</p> : null}
                          {!signupClosed && captainInterestClosed ? (
                            <p className="muted">Captain interest window is closed for this season.</p>
                          ) : null}
                        </form>
                      </div>
                    );
                  })}
                </div>
              )}
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
                {subRequests
                  .filter((entry) => entry.status === "open")
                  .map((request) => (
                    <div key={request.id} className="event-card">
                      <strong>
                        {dvhlTeams.find((entry) => entry.team.id === request.teamId)?.team.name || "DVHL Team"} sub request
                      </strong>
                      <p>{request.message || "A captain requested sub support."}</p>
                      <form className="cta-row" action="/api/dvhl/sub-request" method="post">
                        <input type="hidden" name="action" value="accept" />
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="returnTo" value="/player/dvhl?tab=subs" />
                        <button className="button ghost" type="submit">Accept Sub Spot</button>
                      </form>
                    </div>
                  ))}
                {subRequests.filter((entry) => entry.status === "open").length === 0 ? (
                  <p className="muted">No open sub requests at the moment.</p>
                ) : null}
              </div>
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

          {tab === "self_rating" && (
            <article className="card">
              <h3>DVHL Skill Self Rating (0-100)</h3>
              <p className="muted">
                Use the official level guide below. Hockey Ops uses this during DVHL signups and team balancing.
              </p>
              {currentSkillRating ? (
                <p className="badge">
                  Current: {currentSkillRating.rating} (Level {currentSkillRating.level}) | Position {currentSkillRating.position}
                </p>
              ) : (
                <p className="muted">No DVHL self rating submitted yet.</p>
              )}
              <form className="grid-form" action="/api/player/dvhl/rating" method="post">
                <input type="hidden" name="returnTo" value="/player/dvhl?tab=self_rating" />
                <label>
                  Position
                  <select name="position" defaultValue={currentSkillRating?.position || "O"}>
                    <option value="O">Forward / Offense</option>
                    <option value="D">Defense</option>
                    <option value="G">Goalie</option>
                  </select>
                </label>
                <label>
                  Skill rating
                  <input
                    name="rating"
                    type="number"
                    min={0}
                    max={100}
                    required
                    defaultValue={currentSkillRating?.rating ?? 50}
                  />
                </label>
                <label>
                  Notes (optional)
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={currentSkillRating?.notes || ""}
                    placeholder="Injuries, return-to-play status, role preference"
                  />
                </label>
                <button className="button" type="submit">Save DVHL Self Rating</button>
              </form>
              <details className="event-card admin-disclosure" open>
                <summary>Skill level criteria</summary>
                <div className="stack">
                  {skillLevels.map((entry) => (
                    <div key={entry.level} className="event-card">
                      <strong>
                        Level {entry.level}: {entry.min}-{entry.max}
                      </strong>
                      <p>{entry.summary}</p>
                    </div>
                  ))}
                </div>
              </details>
            </article>
          )}

          {tab === "scoring" && (
            <article className="card">
              <h3>Live Scoring Access</h3>
              <p className="muted">
                If Hockey Ops assigned you as official scorer, your games appear here first.
              </p>
              {myScoringGames.length === 0 ? (
                <p className="muted">No scoring assignments yet.</p>
              ) : (
                <div className="stack">
                  {myScoringGames.map((game) => (
                    <div key={game.id} className="event-card">
                      <strong>{game.teamName} vs {game.opponent || "Opponent"}</strong>
                      <p>{toDateLabel(game.startsAt)}</p>
                      <p>{game.location || "No location set"}</p>
                      <p>Status: {game.liveStatus || "scheduled"}</p>
                      <p>
                        <Link href={`/games#${game.id}`}>Open game-day scoring workflow</Link>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )}

          {tab === "captain" && (
            <article className="card">
              <h3>Captain Tools</h3>
              {myCaptainTeams.length === 0 ? (
                <p className="muted">You are not assigned as a captain for a DVHL team yet.</p>
              ) : (
                <div className="stack">
                  {myCaptainTeams.map(({ competition, team }) => {
                    const draft = draftSessions.find((entry) => entry.competitionId === competition.id)?.draft;
                    const openRequests = subRequests.filter((entry) => entry.teamId === team.id && entry.status === "open");
                    return (
                      <div key={team.id} className="event-card stack">
                        <strong>{team.name}</strong>
                        <p>{competition.title}</p>
                        {draft?.status === "open" ? (
                          <form className="grid-form" action="/api/dvhl/draft/pick" method="post">
                            <input type="hidden" name="competitionId" value={competition.id} />
                            <input type="hidden" name="teamId" value={team.id} />
                            <input type="hidden" name="returnTo" value="/player/dvhl?tab=captain" />
                            <label>
                              Draft pick
                              <select name="userId" defaultValue="">
                                <option value="" disabled>Select player</option>
                                {(draft.poolUserIds || [])
                                  .filter((userId) => !draft.picks.some((pick) => pick.userId === userId))
                                  .map((userId) => (
                                    <option key={userId} value={userId}>
                                      {dvhlPlayersById.get(userId) || userId}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            <button className="button ghost" type="submit">Make Draft Pick</button>
                          </form>
                        ) : (
                          <p className="muted">No open draft session for this season.</p>
                        )}

                        <form className="grid-form" action="/api/dvhl/sub-request" method="post">
                          <input type="hidden" name="action" value="create" />
                          <input type="hidden" name="competitionId" value={competition.id} />
                          <input type="hidden" name="teamId" value={team.id} />
                          <input type="hidden" name="returnTo" value="/player/dvhl?tab=captain" />
                          <input name="message" placeholder="Sub needed for this game (time, role, details)" />
                          <button className="button" type="submit">Request Sub</button>
                        </form>
                        {openRequests.length > 0 ? (
                          <div className="stack">
                            {openRequests.map((request) => (
                              <div key={request.id} className="event-card">
                                <p>{request.message || "Open sub request"}</p>
                                <form className="cta-row" action="/api/dvhl/sub-request" method="post">
                                  <input type="hidden" name="action" value="cancel" />
                                  <input type="hidden" name="requestId" value={request.id} />
                                  <input type="hidden" name="returnTo" value="/player/dvhl?tab=captain" />
                                  <button className="button alt" type="submit">Cancel Request</button>
                                </form>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
