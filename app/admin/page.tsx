import { redirect } from "next/navigation";
import { events, rosters } from "@/lib/mockData";
import { getCurrentUser } from "@/lib/hq/session";
import { readStore } from "@/lib/hq/store";

export default async function AdminPage({
  searchParams
}: {
  searchParams?: { error?: string; approved?: string; rejected?: string };
}) {
  const query = searchParams ?? {};
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?error=sign_in_required");
  }

  if (user.role !== "admin") {
    redirect("/player?error=admin_required");
  }

  const store = await readStore();
  const pendingUsers = store.users.filter((entry) => entry.status === "pending");
  const approvedPlayers = store.users.filter(
    (entry) => entry.status === "approved" && entry.role === "player"
  );
  const rejectedUsers = store.users.filter((entry) => entry.status === "rejected");
  const attendanceByEvent = events.map((event) => {
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

  return (
    <section className="stack">
      <article className="card">
        <h2>Hockey Ops Dashboard</h2>
        <p>Signed in as {user.email}</p>
        {query.approved === "1" && <p className="badge">Player approved and rostered.</p>}
        {query.rejected === "1" && <p className="badge">Registration request rejected.</p>}
        {query.error && <p className="muted">{query.error.replaceAll("_", " ")}</p>}
        <ul>
          <li>Pending Registrations: {pendingUsers.length}</li>
          <li>Approved Players: {approvedPlayers.length}</li>
          <li>Attendance Records: {store.checkIns.length}</li>
          <li>Upcoming Events: {events.length}</li>
        </ul>
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
    </section>
  );
}
