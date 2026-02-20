import Link from "next/link";
import { getCurrentUser } from "@/lib/hq/session";
import { listLiveGames } from "@/lib/hq/live-games";
import GameScoreCard from "@/components/GameScoreCard";

export default async function GamesPage({
  searchParams
}: {
  searchParams?: { score?: string; event?: string; lineup?: string; error?: string };
}) {
  const query = searchParams ?? {};
  const user = await getCurrentUser();
  const games = await listLiveGames();

  return (
    <section className="card">
      <h2>Live Game Tracking</h2>
      <p>Live scores, game logs, and scorekeeper controls.</p>
      {query.score === "saved" && <p className="badge">Scoreboard updated.</p>}
      {query.event === "saved" && <p className="badge">Live event added.</p>}
      {query.lineup === "saved" && <p className="badge">Pregame lineup saved.</p>}
      {query.error && <p className="muted">{query.error.replaceAll("_", " ")}</p>}
      <div className="stack">
        {games.map((game) => {
          const canScorekeep = Boolean(
            user &&
              (user.role === "admin" ||
                (user.status === "approved" && game.scorekeeperUserId === user.id))
          );

          return (
            <article key={game.id} id={game.id} className="event-card stack">
              <GameScoreCard
                gameId={game.id}
                startsAt={game.startsAt}
                location={game.location}
                liveStatus={game.liveStatus}
                competitionTitle={game.competitionTitle}
                homeTeamName={game.teamName}
                awayTeamName={game.opponent || "Opponent"}
                homeScore={game.warriorsScore}
                awayScore={game.opponentScore}
                period={game.period}
                clock={game.clock}
              />
              <p>
                Scorekeeper: {game.scorekeeperName || game.scorekeeperStaffName || "Unassigned"}
                {!canScorekeep && game.scorekeeperStaffName ? " (staff assignment is view-only unless admin)" : ""}
              </p>

              {canScorekeep ? (
                <>
                  <form className="grid-form" action="/api/games/save-lineup" method="post">
                    <input type="hidden" name="gameId" value={game.id} />
                    <strong>Pregame Lineup</strong>
                    <p className="muted">Select dressed Warriors and lock before opening live scoring.</p>
                    {game.teamMembers && game.teamMembers.length > 0 ? (
                      <div className="stack">
                        {game.teamMembers.map((member) => (
                          <label key={`${game.id}-lineup-${member.id}`}>
                            <input
                              type="checkbox"
                              name="selectedUserIds"
                              value={member.id}
                              defaultChecked={(game.lineup?.selectedUserIds || []).includes(member.id)}
                            />{" "}
                            {member.fullName} {member.jerseyNumber ? `#${member.jerseyNumber}` : ""}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">No team roster assigned yet. Add players in DVHL/Hockey Ops first.</p>
                    )}
                    <label>
                      Opponent lineup / notes
                      <textarea name="opponentRoster" rows={3} defaultValue={game.lineup?.opponentRoster || ""} />
                    </label>
                    <label>
                      <input name="locked" type="checkbox" defaultChecked={Boolean(game.lineup?.locked)} /> Lock lineup
                    </label>
                    <button className="button ghost" type="submit">Save Pregame Lineup</button>
                  </form>

                  <form className="grid-form" action="/api/games/update-score" method="post">
                    <input type="hidden" name="gameId" value={game.id} />
                    <label>
                      Warriors score
                      <input name="warriorsScore" type="number" min="0" defaultValue={game.warriorsScore} />
                    </label>
                    <label>
                      Opponent score
                      <input name="opponentScore" type="number" min="0" defaultValue={game.opponentScore} />
                    </label>
                    <label>
                      Period
                      <input name="period" defaultValue={game.period || "P1"} />
                    </label>
                    <label>
                      Clock
                      <input name="clock" placeholder="12:44" defaultValue={game.clock || ""} />
                    </label>
                    <label>
                      Status
                      <select name="liveStatus" defaultValue={game.liveStatus || "scheduled"}>
                        <option value="scheduled">Scheduled</option>
                        <option value="live">Live</option>
                        <option value="final">Final</option>
                      </select>
                    </label>
                    <button className="button" type="submit">Update Scoreboard</button>
                  </form>

                  <form className="grid-form" action="/api/games/add-event" method="post">
                    <input type="hidden" name="gameId" value={game.id} />
                    <label>
                      Team
                      <select name="team" defaultValue="Warriors">
                        <option value="Warriors">Warriors</option>
                        <option value="Opponent">Opponent</option>
                      </select>
                    </label>
                    <label>
                      Event type
                      <select name="eventType" defaultValue="goal">
                        <option value="goal">Goal</option>
                        <option value="penalty">Penalty</option>
                        <option value="shot">Shot</option>
                        <option value="save">Save</option>
                        <option value="assist">Assist</option>
                      </select>
                    </label>
                    <label>
                      Period
                      <input name="period" defaultValue={game.period || "P1"} />
                    </label>
                    <label>
                      Clock
                      <input name="clock" placeholder="12:44" defaultValue={game.clock || ""} />
                    </label>
                    <input name="note" placeholder="Note" />
                    <button className="button alt" type="submit">Add Live Event</button>
                  </form>
                </>
              ) : (
                <p className="muted">
                  No scorekeeping access. If you should have access, ask Hockey Ops to assign you as scorekeeper for this game.
                </p>
              )}

              {game.events.length > 0 ? (
                <ul>
                  {game.events.map((event) => (
                    <li key={event.id}>
                      {event.clock || "--:--"} | {event.team} | {event.eventType} | {event.note || "-"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No live events yet.</p>
              )}
              {game.lineup ? (
                <p className="muted">
                  Lineup status: {game.lineup.locked ? "Locked" : "Draft"} | Selected: {game.lineup.selectedUserIds.length}
                </p>
              ) : null}
            </article>
          );
        })}
        {games.length === 0 && (
          <p className="muted">
            No games yet. Create competition games in <Link href="/admin?section=competitions">Hockey Ops competitions</Link>.
          </p>
        )}
      </div>
    </section>
  );
}
