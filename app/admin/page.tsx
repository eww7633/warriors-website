import Link from "next/link";
import { redirect } from "next/navigation";
import { rosters } from "@/lib/mockData";
import { hasDatabaseUrl } from "@/lib/db-env";
import { getCurrentUser } from "@/lib/hq/session";
import { readStore } from "@/lib/hq/store";
import { getAllEvents } from "@/lib/hq/events";
import {
  competitionTypeLabel,
  listCompetitions,
  listEligiblePlayers
} from "@/lib/hq/competitions";

export const dynamic = "force-dynamic";

const sections = [
  ["overview", "Overview"],
  ["competitions", "Competitions"],
  ["events", "Events"],
  ["players", "Players"],
  ["attendance", "Attendance"]
] as const;

type Section = (typeof sections)[number][0];

export default async function AdminPage({
  searchParams
}: {
  searchParams?: {
    section?: string;
    error?: string;
    approved?: string;
    rejected?: string;
    eventsaved?: string;
    competition?: string;
    assignment?: string;
    game?: string;
  };
}) {
  const query = searchParams ?? {};
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?error=sign_in_required");
  }

  if (user.role !== "admin") {
    redirect("/player?error=admin_required");
  }

  const section: Section = sections.some(([value]) => value === query.section)
    ? (query.section as Section)
    : "overview";

  const [store, allEvents, competitions, eligiblePlayers] = await Promise.all([
    readStore(),
    getAllEvents(),
    listCompetitions(),
    listEligiblePlayers()
  ]);

  const pendingUsers = store.users.filter((entry) => entry.status === "pending");
  const approvedPlayers = store.users.filter(
    (entry) => entry.status === "approved" && entry.role === "player"
  );
  const rejectedUsers = store.users.filter((entry) => entry.status === "rejected");

  const attendanceByEvent = allEvents.map((event) => {
    const rows = store.checkIns.filter((entry) => entry.eventId === event.id);
    return {
      eventId: event.id,
      title: event.title,
      checkedInAttended: rows.filter((row) => row.attendanceStatus === "checked_in_attended").length,
      checkedInNoShow: rows.filter((row) => row.attendanceStatus === "checked_in_no_show").length,
      walkInAttended: rows.filter((row) => row.attendanceStatus === "walk_in_attended").length,
      absent: rows.filter((row) => row.attendanceStatus === "absent").length
    };
  });

  const statusMessages = [
    query.approved === "1" ? "Player approved and rostered." : null,
    query.rejected === "1" ? "Registration request rejected." : null,
    query.eventsaved === "1" ? "Event saved and ready for public feed." : null,
    query.competition === "created" ? "Competition created." : null,
    query.assignment === "saved" ? "Player assigned to competition team." : null,
    query.game === "created" ? "Competition game created." : null
  ].filter(Boolean) as string[];

  return (
    <section className="stack">
      <article className="card">
        <h2>Hockey Ops Dashboard</h2>
        <p>Signed in as {user.email}</p>
        <p>Storage mode: <strong>{hasDatabaseUrl() ? "Database" : "Fallback file"}</strong></p>
        {statusMessages.map((message) => (
          <p className="badge" key={message}>{message}</p>
        ))}
        {query.error && <p className="muted">{query.error.replaceAll("_", " ")}</p>}

        <nav className="ops-tabs" aria-label="Admin sections">
          {sections.map(([key, label]) => (
            <Link
              key={key}
              href={`/admin?section=${key}`}
              className={`ops-tab ${section === key ? "active" : ""}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </article>

      {section === "overview" && (
        <article className="card">
          <h3>Overview</h3>
          <ul>
            <li>Pending Registrations: {pendingUsers.length}</li>
            <li>Approved Players: {approvedPlayers.length}</li>
            <li>Rejected Requests: {rejectedUsers.length}</li>
            <li>Attendance Records: {store.checkIns.length}</li>
            <li>Events in HQ: {allEvents.length}</li>
            <li>Competitions: {competitions.length}</li>
          </ul>
        </article>
      )}

      {section === "competitions" && (
        <>
          <article className="card">
            <h3>Create Tournament</h3>
            <p className="muted">National tournament setup with optional Gold/White/Black teams.</p>
            <form className="grid-form" action="/api/admin/competitions/tournament" method="post">
              <input name="title" placeholder="Tournament name" required />
              <label>
                Start date/time
                <input name="startsAt" type="datetime-local" />
              </label>
              <label>
                Notes
                <input name="notes" placeholder="Optional notes" />
              </label>
              <label><input type="checkbox" name="gold" defaultChecked /> Gold team</label>
              <label><input type="checkbox" name="white" /> White team</label>
              <label><input type="checkbox" name="black" /> Black team</label>
              <button className="button" type="submit">Create Tournament</button>
            </form>
          </article>

          <article className="card">
            <h3>Create Single Game</h3>
            <p className="muted">Single exhibition game roster (Gold, Black, or Mixed).</p>
            <form className="grid-form" action="/api/admin/competitions/single-game" method="post">
              <input name="title" placeholder="Single game title" required />
              <label>
                Start date/time
                <input name="startsAt" type="datetime-local" />
              </label>
              <input name="teamName" placeholder="Team label (e.g. Mixed Squad)" defaultValue="Single Game Squad" />
              <label>
                Roster mode
                <select name="rosterMode" defaultValue="mixed">
                  <option value="gold">Gold</option>
                  <option value="black">Black</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>
              <input name="notes" placeholder="Optional notes" />
              <button className="button" type="submit">Create Single Game</button>
            </form>
          </article>

          <article className="card">
            <h3>Create DVHL League</h3>
            <p className="muted">In-house draft league with four team names from eligible players.</p>
            <form className="grid-form" action="/api/admin/competitions/dvhl" method="post">
              <input name="title" placeholder="DVHL session title" required />
              <label>
                Start date/time
                <input name="startsAt" type="datetime-local" />
              </label>
              <input name="team1" placeholder="Team 1 name" required />
              <input name="team2" placeholder="Team 2 name" required />
              <input name="team3" placeholder="Team 3 name" required />
              <input name="team4" placeholder="Team 4 name" required />
              <input name="notes" placeholder="Optional notes" />
              <button className="button" type="submit">Create DVHL Session</button>
            </form>
          </article>

          <article className="card">
            <h3>Competition Team Builder</h3>
            <p className="muted">Assign approved players and create team-specific games for each squad.</p>
            {competitions.length === 0 ? (
              <p className="muted">No competitions created yet.</p>
            ) : (
              <div className="stack">
                {competitions.map((competition) => (
                  <div key={competition.id} className="event-card stack">
                    <strong>{competition.title}</strong>
                    <p>{competitionTypeLabel(competition.type as "TOURNAMENT" | "SINGLE_GAME" | "DVHL")}</p>
                    <p>{competition.startsAt ? new Date(competition.startsAt).toLocaleString() : "No start date"}</p>
                    <div className="stack">
                      {competition.teams.map((team) => (
                        <div key={team.id} className="event-card stack">
                          <strong>{team.name}</strong>
                          <p>Mode: {team.rosterMode || "-"}</p>
                          <p>Roster count: {team.members.length}</p>
                          <p>
                            Players: {team.members.length > 0
                              ? team.members.map((member) => member.user.fullName).join(", ")
                              : "No players assigned"}
                          </p>

                          <form className="grid-form" action="/api/admin/competitions/assign-player" method="post">
                            <input type="hidden" name="teamId" value={team.id} />
                            <label>
                              Add approved player
                              <select name="userId" required defaultValue="">
                                <option value="" disabled>Select player</option>
                                {eligiblePlayers.map((player) => (
                                  <option key={player.id} value={player.id}>
                                    {player.fullName} ({player.rosterId || "No roster"}) #{player.jerseyNumber || "-"}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button className="button" type="submit">Assign Player</button>
                          </form>

                          <form className="grid-form" action="/api/admin/competitions/add-game" method="post">
                            <input type="hidden" name="teamId" value={team.id} />
                            <input name="opponent" placeholder="Opponent name" required />
                            <label>
                              Game date/time
                              <input name="startsAt" type="datetime-local" />
                            </label>
                            <input name="location" placeholder="Location" />
                            <input name="notes" placeholder="Game notes" />
                            <button className="button alt" type="submit">Add Team Game</button>
                          </form>

                          <div className="stack">
                            {team.games.length === 0 ? (
                              <p className="muted">No games added for this team.</p>
                            ) : (
                              team.games.map((game) => (
                                <div key={game.id} className="event-card">
                                  <strong>vs {game.opponent}</strong>
                                  <p>{game.startsAt ? new Date(game.startsAt).toLocaleString() : "No date"}</p>
                                  <p>{game.location || "No location"}</p>
                                  <p>Status: {game.status}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </>
      )}

      {section === "events" && (
        <>
          <article className="card">
            <h3>Publish Event (WordPress feed source)</h3>
            <form className="grid-form" action="/api/admin/events" method="post">
              <input name="title" placeholder="Event title" required />
              <label>
                Start date/time
                <input name="startsAt" type="datetime-local" required />
              </label>
              <input name="locationPublic" placeholder="Public location" />
              <input name="locationPrivate" placeholder="Private location (players/admin)" />
              <label>
                Public details
                <input name="publicDetails" placeholder="Public summary" required />
              </label>
              <label>
                Private details
                <input name="privateDetails" placeholder="Private logistics" />
              </label>
              <label>
                Visibility
                <select name="visibility" defaultValue="public">
                  <option value="public">Public</option>
                  <option value="player_only">Player only</option>
                  <option value="internal">Internal (admin only)</option>
                </select>
              </label>
              <label>
                <input name="published" type="checkbox" defaultChecked /> Publish to public feed
              </label>
              <button className="button" type="submit">Save Event</button>
            </form>
          </article>

          <article className="card">
            <h3>Current Event Feed Inventory</h3>
            <div className="stack">
              {allEvents.map((event) => (
                <div key={event.id} className="event-card">
                  <strong>{event.title}</strong>
                  <p>{new Date(event.date).toLocaleString()}</p>
                  <p>Visibility: {event.visibility}</p>
                  <p>Published: {event.published ? "Yes" : "No"}</p>
                </div>
              ))}
            </div>
          </article>
        </>
      )}

      {section === "players" && (
        <>
          <article className="card">
            <h3>Central Roster Tools</h3>
            <p className="muted">
              Manage active/inactive players, sortable columns, exports, and roster history.
            </p>
            <p>
              <Link className="button ghost" href="/admin/roster">
                Open Central Roster Manager
              </Link>
            </p>
          </article>

          <article className="card">
            <h3>Pending Registration Requests</h3>
            {pendingUsers.length === 0 ? (
              <p className="muted">No pending requests.</p>
            ) : (
              <div className="stack">
                {pendingUsers.map((candidate) => (
                  <form
                    key={candidate.id}
                    className="event-card stack"
                    action={`/api/admin/users/${candidate.id}/approve`}
                    method="post"
                  >
                    <strong>{candidate.fullName}</strong>
                    <p>{candidate.email}</p>
                    <p>Requested position: {candidate.requestedPosition || "Not provided"}</p>
                    <label>
                      Assign roster
                      <select name="rosterId" required defaultValue="">
                        <option value="" disabled>Select roster</option>
                        {rosters.map((roster) => (
                          <option key={roster.id} value={roster.id}>{roster.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Official jersey number
                      <input name="jerseyNumber" type="number" min="1" max="99" required />
                    </label>
                    <div className="cta-row">
                      <button className="button" type="submit">Approve and Add to Roster</button>
                    </div>
                  </form>
                ))}
              </div>
            )}
          </article>

          <article className="card">
            <h3>Reject Request</h3>
            {pendingUsers.length === 0 ? (
              <p className="muted">No pending requests.</p>
            ) : (
              <div className="stack">
                {pendingUsers.map((candidate) => (
                  <form
                    key={`${candidate.id}-reject`}
                    className="event-card"
                    action={`/api/admin/users/${candidate.id}/reject`}
                    method="post"
                  >
                    <p>
                      {candidate.fullName} ({candidate.email})
                    </p>
                    <button className="button alt" type="submit">Reject Request</button>
                  </form>
                ))}
              </div>
            )}
          </article>

          <article className="card">
            <h3>Approved Player Registry</h3>
            <div className="stack">
              {approvedPlayers.map((player) => {
                const playerCheckIns = store.checkIns.filter((entry) => entry.userId === player.id);
                return (
                  <div key={player.id} className="event-card">
                    <strong>{player.fullName}</strong>
                    <p>{player.email}</p>
                    <p>Roster: {player.rosterId}</p>
                    <p>Jersey: #{player.jerseyNumber}</p>
                    <p>
                      Sizes: helmet {player.equipmentSizes.helmet || "-"}, gloves {player.equipmentSizes.gloves || "-"},
                      skates {player.equipmentSizes.skates || "-"}, jersey {player.equipmentSizes.jersey || "-"}
                    </p>
                    <p>Attendance records: {playerCheckIns.length}</p>
                  </div>
                );
              })}
              {approvedPlayers.length === 0 && <p className="muted">No approved players yet.</p>}
            </div>
          </article>

          <article className="card">
            <h3>Rejected Requests</h3>
            <div className="stack">
              {rejectedUsers.map((entry) => (
                <div key={entry.id} className="event-card">
                  <strong>{entry.fullName}</strong>
                  <p>{entry.email}</p>
                  <p>Updated: {new Date(entry.updatedAt).toLocaleString()}</p>
                </div>
              ))}
              {rejectedUsers.length === 0 && <p className="muted">No rejected requests.</p>}
            </div>
          </article>
        </>
      )}

      {section === "attendance" && (
        <article className="card">
          <h3>Attendance Audit by Event</h3>
          <div className="stack">
            {attendanceByEvent.map((entry) => (
              <div key={entry.eventId} className="event-card">
                <strong>{entry.title}</strong>
                <p>Checked in + attended: {entry.checkedInAttended}</p>
                <p>Checked in + no-show: {entry.checkedInNoShow}</p>
                <p>Walk-in attended: {entry.walkInAttended}</p>
                <p>Absent: {entry.absent}</p>
              </div>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}
