import { redirect } from "next/navigation";
import { events, roster } from "@/lib/mockData";
import { getCurrentUser } from "@/lib/hq/session";
import { readStore } from "@/lib/hq/store";
import { getCalendarEventsForRole } from "@/lib/hq/events";
import { listReservationBoards } from "@/lib/hq/reservations";
import { getPlayerRosterProfile } from "@/lib/hq/roster";
import {
  listJerseyNumberRequestsByUser,
  listPhotoSubmissionRequestsByUser
} from "@/lib/hq/player-requests";
import {
  getPlayerProfileExtra,
  listJerseyOptionsForPlayer,
  listTeamAssignmentsByUser,
  usaHockeySeasonLabel
} from "@/lib/hq/player-profiles";

export const dynamic = "force-dynamic";

export default async function PlayerPage({
  searchParams
}: {
  searchParams?: {
    saved?: string | string[];
    reservation?: string | string[];
    error?: string | string[];
  };
}) {
  const query = searchParams ?? {};
  const querySaved = Array.isArray(query.saved) ? query.saved[0] : query.saved;
  const queryReservation = Array.isArray(query.reservation) ? query.reservation[0] : query.reservation;
  const queryError = Array.isArray(query.error) ? query.error[0] : query.error;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?error=sign_in_required");
  }

  if (user.role === "admin") {
    redirect("/admin");
  }

  const [store, profile, photoRequests, jerseyRequests, profileExtra, teamAssignments] = await Promise.all([
    readStore(),
    getPlayerRosterProfile(user.id),
    listPhotoSubmissionRequestsByUser(user.id),
    listJerseyNumberRequestsByUser(user.id),
    getPlayerProfileExtra(user.id),
    listTeamAssignmentsByUser(user.id)
  ]);

  const latestUser = store.users.find((entry) => entry.id === user.id) ?? user;
  const checkIns = store.checkIns.filter((entry) => entry.userId === latestUser.id).slice(-10).reverse();

  const canManageEvents = latestUser.status === "approved";
  const calendarEvents = canManageEvents ? await getCalendarEventsForRole("player", true) : [];
  const now = Date.now();
  const myEvents = calendarEvents
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const reservationBoards = await listReservationBoards(
    myEvents.map((event) => event.id),
    latestUser.id
  );

  const myUpcomingEvents = myEvents.filter((event) => new Date(event.date).getTime() >= now).slice(0, 10);
  const myPastEvents = myEvents.filter((event) => new Date(event.date).getTime() < now).slice(-4).reverse();

  const officialPhoto = profile?.photos.find((entry) => entry.isPrimary) || profile?.photos[0] || null;

  const availableJerseyNumbers = latestUser.rosterId
    ? await listJerseyOptionsForPlayer({ userId: latestUser.id, currentJerseyNumber: latestUser.jerseyNumber })
    : [];

  const pendingPhoto = photoRequests.find((entry) => entry.status === "pending");
  const pendingJersey = jerseyRequests.find((entry) => entry.status === "pending");
  const equipment = latestUser.equipmentSizes ?? {};

  return (
    <section className="stack">
      <article className="card">
        <h2>Warrior HQ Player Hub</h2>
        <p>
          Signed in as <strong>{latestUser.fullName}</strong> ({latestUser.email})
        </p>
        <p>
          Status: <strong>{latestUser.status}</strong>
        </p>
        {querySaved === "equipment" && <p className="badge">Equipment profile saved.</p>}
        {querySaved === "profile" && <p className="badge">Contact profile saved.</p>}
        {querySaved === "photo_request" && <p className="badge">Photo submission sent to Hockey Ops for review.</p>}
        {querySaved === "jersey_request" && <p className="badge">Jersey number request sent to Hockey Ops.</p>}
        {querySaved === "jersey_auto_granted" && <p className="badge">Jersey number updated automatically.</p>}
        {querySaved === "reservation" || queryReservation === "saved" ? <p className="badge">RSVP updated.</p> : null}
        {queryError && <p className="muted">{queryError.replaceAll("_", " ")}</p>}
        {latestUser.status === "rejected" && (
          <p className="muted">
            Your registration request was rejected. Contact Hockey Ops for review before reapplying.
          </p>
        )}
        {latestUser.status !== "approved" || !latestUser.rosterId ? (
          <p className="muted">
            {latestUser.status === "rejected"
              ? "Your account is not approved for HQ access."
              : "Your account is pending Hockey Ops approval and roster assignment. HQ tools unlock after approval."}
          </p>
        ) : (
          <>
            <p>Roster ID: {latestUser.rosterId}</p>
            <p>Official jersey number: #{latestUser.jerseyNumber}</p>
            <p>Primary sub-roster: {profileExtra.primarySubRoster?.toUpperCase() || "Not assigned yet"}</p>
            <p>USA Hockey #: {profileExtra.usaHockeyNumber || "Not set yet"}</p>
            <p>
              USA Hockey season: {profileExtra.usaHockeySeason || "Not set"} | Status:{" "}
              {profileExtra.usaHockeyStatus || "unverified"} | Current season target:{" "}
              {usaHockeySeasonLabel()}
            </p>
          </>
        )}
      </article>

      <article className="card">
        <h3>My Contact + USA Hockey</h3>
        <form className="grid-form" action="/api/player/profile/contact" method="post">
          <input name="addressLine1" placeholder="Address line 1" defaultValue={profileExtra.address?.line1 || ""} />
          <input name="addressLine2" placeholder="Address line 2" defaultValue={profileExtra.address?.line2 || ""} />
          <input name="city" placeholder="City" defaultValue={profileExtra.address?.city || ""} />
          <input name="stateProvince" placeholder="State/Province" defaultValue={profileExtra.address?.stateProvince || ""} />
          <input name="postalCode" placeholder="ZIP/Postal code" defaultValue={profileExtra.address?.postalCode || ""} />
          <input name="country" placeholder="Country" defaultValue={profileExtra.address?.country || ""} />
          <input
            name="usaHockeyNumber"
            placeholder="USA Hockey number"
            defaultValue={profileExtra.usaHockeyNumber || ""}
          />
          <button className="button" type="submit">Save Contact Profile</button>
        </form>
        <p className="muted">
          Entering a USA Hockey number marks it as unverified until Hockey Ops or SportsEngine sync verifies it.
        </p>
      </article>

      <article className="card">
        <h3>My Team Assignments</h3>
        {teamAssignments.length === 0 ? (
          <p className="muted">No team assignments have been published to your profile yet.</p>
        ) : (
          <div className="stack">
            {teamAssignments.map((assignment) => (
              <div key={assignment.id} className="event-card">
                <strong>{assignment.teamName}</strong>
                <p>
                  {assignment.assignmentType}
                  {assignment.seasonLabel ? ` | ${assignment.seasonLabel}` : ""}
                  {assignment.sessionLabel ? ` | ${assignment.sessionLabel}` : ""}
                </p>
                {assignment.subRosterLabel ? <p>Sub-roster: {assignment.subRosterLabel}</p> : null}
                <p>Status: {assignment.status}</p>
                <p>
                  {assignment.startsAt ? `Starts ${new Date(assignment.startsAt).toLocaleDateString()}` : "No start date"}
                  {assignment.endsAt ? ` | Ends ${new Date(assignment.endsAt).toLocaleDateString()}` : ""}
                </p>
                {assignment.notes ? <p className="muted">{assignment.notes}</p> : null}
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="card">
        <h3>My Events & RSVP Management</h3>
        {!canManageEvents ? (
          <p className="muted">Event RSVP tools unlock after player approval.</p>
        ) : (
          <div className="stack">
            {myUpcomingEvents.map((event) => {
              const myStatus = reservationBoards.viewerStatusByEvent[event.id] || "not_set";
              return (
                <article key={event.id} className="event-card">
                  <strong>{event.title}</strong>
                  <p>{new Date(event.date).toLocaleString()}</p>
                  {event.locationPublic ? <p>{event.locationPublic}</p> : null}
                  <p className="muted">Your RSVP: {myStatus.replaceAll("_", " ")}</p>
                  <form className="grid-form" action="/api/events/reservation" method="post">
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="returnTo" value="/player" />
                    <select name="status" defaultValue={myStatus === "not_set" ? "going" : myStatus}>
                      <option value="going">Going</option>
                      <option value="maybe">Maybe</option>
                      <option value="not_going">Not going</option>
                    </select>
                    <input name="note" placeholder="Optional note" />
                    <button className="button" type="submit">Save RSVP</button>
                  </form>
                </article>
              );
            })}
            {myUpcomingEvents.length === 0 ? (
              <p className="muted">No upcoming events currently available.</p>
            ) : null}

            {myPastEvents.length > 0 ? (
              <details className="event-card admin-disclosure">
                <summary>Recent past events</summary>
                <div className="stack">
                  {myPastEvents.map((event) => (
                    <div key={event.id} className="event-card">
                      <strong>{event.title}</strong>
                      <p>{new Date(event.date).toLocaleString()}</p>
                      <p className="muted">
                        Your RSVP: {(reservationBoards.viewerStatusByEvent[event.id] || "not_set").replaceAll("_", " ")}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        )}
      </article>

      <article className="card">
        <h3>Official Photo</h3>
        {officialPhoto ? (
          <div className="stack">
            <img
              src={officialPhoto.imageUrl}
              alt="Official player photo"
              style={{ maxWidth: "280px", width: "100%", borderRadius: "12px", border: "1px solid #d9cfbe" }}
            />
            <p className="muted">Current official photo on file.</p>
          </div>
        ) : (
          <p className="muted">No official photo on file yet.</p>
        )}

        {pendingPhoto ? (
          <p className="badge">A photo request is already pending Hockey Ops approval.</p>
        ) : (
          <form className="grid-form" action="/api/player/photo-request" method="post">
            <input name="imageUrl" placeholder="New photo URL" required />
            <input name="caption" placeholder="Optional caption/context" />
            <button className="button" type="submit">Submit Photo For Approval</button>
          </form>
        )}

        {photoRequests.length > 0 ? (
          <details className="event-card admin-disclosure">
            <summary>Photo request history</summary>
            <div className="stack">
              {photoRequests.map((entry) => (
                <div className="event-card" key={entry.id}>
                  <p>
                    <strong>Status:</strong> {entry.status}
                  </p>
                  <p>
                    <strong>Submitted:</strong> {new Date(entry.createdAt).toLocaleString()}
                  </p>
                  <p>
                    <a href={entry.imageUrl} target="_blank" rel="noreferrer">
                      Open submitted photo
                    </a>
                  </p>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </article>

      <article className="card">
        <h3>Jersey Number Change Request</h3>
        {!latestUser.rosterId ? (
          <p className="muted">Roster assignment is required before requesting a number change.</p>
        ) : !profileExtra.primarySubRoster ? (
          <p className="muted">
            Hockey Ops must assign your primary sub-roster (Gold/White/Black) before number options can be shown.
          </p>
        ) : (
          <>
            <p>
              Current number: <strong>#{latestUser.jerseyNumber || "-"}</strong>
            </p>
            {pendingJersey ? (
              <p className="badge">A jersey number request is already pending Hockey Ops review.</p>
            ) : availableJerseyNumbers.length === 0 ? (
              <p className="muted">
                No eligible jersey options currently match your sub-roster overlap policy. Ask Hockey Ops for help.
              </p>
            ) : (
              <form className="grid-form" action="/api/player/jersey-request" method="post">
                <select name="requestedJerseyNumber" defaultValue="" required>
                  <option value="" disabled>
                    Select available number
                  </option>
                  {availableJerseyNumbers.map((option) => (
                    <option key={option.number} value={option.number}>
                      {option.displayLabel}
                    </option>
                  ))}
                </select>
                <button className="button" type="submit">Request Jersey Change</button>
              </form>
            )}
            <p className="muted">
              Numbers marked with * are shared across gold/black and require Hockey Ops approval.
            </p>
          </>
        )}

        {jerseyRequests.length > 0 ? (
          <details className="event-card admin-disclosure">
            <summary>Jersey request history</summary>
            <div className="stack">
              {jerseyRequests.map((entry) => (
                <div className="event-card" key={entry.id}>
                  <p>
                    <strong>Status:</strong> {entry.status}
                  </p>
                  <p>
                    Requested #{entry.requestedJerseyNumber} on {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </article>

      <article className="card">
        <h3>Equipment and Clothing Sizes</h3>
        <form className="grid-form" action="/api/player/equipment" method="post">
          <input name="helmet" placeholder="Helmet size" defaultValue={equipment.helmet || ""} />
          <input name="gloves" placeholder="Glove size" defaultValue={equipment.gloves || ""} />
          <input name="skates" placeholder="Skate size" defaultValue={equipment.skates || ""} />
          <input name="pants" placeholder="Pants size" defaultValue={equipment.pants || ""} />
          <input name="stick" placeholder="Stick specs" defaultValue={equipment.stick || ""} />
          <input name="jersey" placeholder="Jersey size" defaultValue={equipment.jersey || ""} />
          <input name="shell" placeholder="Shell size" defaultValue={equipment.shell || ""} />
          <input name="warmupTop" placeholder="Warmup top size" defaultValue={equipment.warmupTop || ""} />
          <input name="warmupBottom" placeholder="Warmup bottom size" defaultValue={equipment.warmupBottom || ""} />
          <button className="button" type="submit">Save Size Profile</button>
        </form>
      </article>

      <article className="card">
        <h3>Recent Check-Ins</h3>
        {checkIns.length === 0 ? (
          <p className="muted">No check-ins recorded yet.</p>
        ) : (
          <div className="stack">
            {checkIns.map((entry) => {
              const event = events.find((item) => item.id === entry.eventId);
              return (
                <div key={entry.id} className="event-card">
                  <strong>{event?.title ?? entry.eventId}</strong>
                  <p>Status: {entry.attendanceStatus.replaceAll("_", " ")}</p>
                  <p>Checked in: {entry.checkedInAt ? new Date(entry.checkedInAt).toLocaleString() : "-"}</p>
                  <p>Arrived: {entry.arrivedAt ? new Date(entry.arrivedAt).toLocaleString() : "-"}</p>
                </div>
              );
            })}
          </div>
        )}
      </article>

      <article className="card">
        <h3>Performance Snapshot</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Pos</th>
              <th>Status</th>
              <th>GP</th>
              <th>G</th>
              <th>A</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((player) => (
              <tr key={player.id}>
                <td>{player.name}</td>
                <td>{player.position}</td>
                <td>{player.status}</td>
                <td>{player.gamesPlayed}</td>
                <td>{player.goals}</td>
                <td>{player.assists}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
