import Link from "next/link";
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
import {
  getPlayerOnboardingState,
  isPlayerOnboardingComplete
} from "@/lib/hq/player-onboarding";
import { getNotificationPreference } from "@/lib/hq/notifications";
import {
  canEventCollectGuests,
  getEventGuestIntentMap,
  getEventRosterSelectionMap,
  getEventSignupConfigMap,
  isDvhlEvent,
  isInterestSignupClosed
} from "@/lib/hq/event-signups";

export const dynamic = "force-dynamic";

const sections = [
  ["overview", "Overview"],
  ["onboarding", "Onboarding"],
  ["notifications", "Notifications"],
  ["profile", "Profile"],
  ["events", "Events"],
  ["dvhl", "DVHL"],
  ["teams", "Teams"],
  ["gear", "Gear"]
] as const;

type Section = (typeof sections)[number][0];

export default async function PlayerPage({
  searchParams
}: {
  searchParams?: {
    saved?: string | string[];
    reservation?: string | string[];
    error?: string | string[];
    section?: string | string[];
    guest?: string | string[];
  };
}) {
  const query = searchParams ?? {};
  const querySaved = Array.isArray(query.saved) ? query.saved[0] : query.saved;
  const queryReservation = Array.isArray(query.reservation) ? query.reservation[0] : query.reservation;
  const queryError = Array.isArray(query.error) ? query.error[0] : query.error;
  const querySection = Array.isArray(query.section) ? query.section[0] : query.section;
  const queryGuest = Array.isArray(query.guest) ? query.guest[0] : query.guest;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?error=sign_in_required");
  }

  const [store, profile, photoRequests, jerseyRequests, profileExtra, teamAssignments, onboardingState, notificationPref] = await Promise.all([
    readStore(),
    getPlayerRosterProfile(user.id),
    listPhotoSubmissionRequestsByUser(user.id),
    listJerseyNumberRequestsByUser(user.id),
    getPlayerProfileExtra(user.id),
    listTeamAssignmentsByUser(user.id),
    getPlayerOnboardingState(user.id),
    getNotificationPreference(user.id)
  ]);

  const latestUser = store.users.find((entry) => entry.id === user.id) ?? user;
  const onboardingComplete = isPlayerOnboardingComplete(onboardingState);
  const section: Section = sections.some(([value]) => value === querySection)
    ? (querySection as Section)
    : latestUser.status === "approved" && !onboardingComplete
    ? "onboarding"
    : "overview";
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
  const [signupConfigsByEvent, rosterSelectionsByEvent, guestIntentsByEvent] = await Promise.all([
    getEventSignupConfigMap(myEvents.map((event) => event.id)),
    getEventRosterSelectionMap(myEvents.map((event) => event.id)),
    getEventGuestIntentMap(myEvents.map((event) => event.id))
  ]);

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
    <section className="stack admin-shell">
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
        {querySaved === "onboarding" && <p className="badge">Onboarding completed. Hockey Ops can now finalize your assignments.</p>}
        {querySaved === "notifications" && <p className="badge">Notification preferences saved.</p>}
        {querySaved === "photo_request" && <p className="badge">Photo submission sent to Hockey Ops for review.</p>}
        {querySaved === "jersey_request" && <p className="badge">Jersey number request sent to Hockey Ops.</p>}
        {querySaved === "jersey_auto_granted" && <p className="badge">Jersey number updated automatically.</p>}
        {querySaved === "reservation" || queryReservation === "saved" ? <p className="badge">RSVP updated.</p> : null}
        {queryGuest === "saved" ? <p className="badge">Guest request updated.</p> : null}
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
            {!onboardingComplete ? (
              <p className="badge">Onboarding incomplete: complete the onboarding checklist to unlock full HQ setup.</p>
            ) : (
              <p className="badge">Onboarding complete.</p>
            )}
            <p>Official jersey number: #{latestUser.jerseyNumber}</p>
            <p>Team color roster: {profileExtra.primarySubRoster?.toUpperCase() || "Not assigned yet"}</p>
            <p>USA Hockey #: {profileExtra.usaHockeyNumber || "Not set yet"}</p>
            <p>
              USA Hockey season: {profileExtra.usaHockeySeason || "Not set"} | Status:{" "}
              {profileExtra.usaHockeyStatus || "unverified"} | Current season target:{" "}
              {usaHockeySeasonLabel()}
            </p>
          </>
        )}
      </article>

      <div className="admin-panel-layout">
        <aside className="card admin-side-nav-card">
          <h3>Player Hub</h3>
          <nav className="admin-side-nav" aria-label="Player sections">
            {sections.map(([key, label]) => (
              <Link
                key={key}
                href={`/player?section=${key}`}
                className={`admin-side-link ${section === key ? "active" : ""}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="stack admin-panel-content">
      {section === "overview" && (
      <>
      <article className="card">
        <h3>Player Snapshot</h3>
        <div className="admin-kpi-grid">
          <Link href="/player?section=onboarding" className="admin-kpi admin-kpi-link">
            <span className="muted">Status</span>
            <strong>{latestUser.status}</strong>
            <span className="admin-kpi-cta">Open</span>
          </Link>
          <Link href="/player?section=teams" className="admin-kpi admin-kpi-link">
            <span className="muted">Team Color</span>
            <strong>{profileExtra.primarySubRoster?.toUpperCase() || "Pending"}</strong>
            <span className="admin-kpi-cta">Open</span>
          </Link>
          <Link href="/player?section=gear" className="admin-kpi admin-kpi-link">
            <span className="muted">Jersey</span>
            <strong>{latestUser.jerseyNumber ? `#${latestUser.jerseyNumber}` : "Unassigned"}</strong>
            <span className="admin-kpi-cta">Open</span>
          </Link>
          <Link href="/player?section=events" className="admin-kpi admin-kpi-link">
            <span className="muted">Upcoming Events</span>
            <strong>{myUpcomingEvents.length}</strong>
            <span className="admin-kpi-cta">Open</span>
          </Link>
        </div>
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
      </>
      )}

      {section === "onboarding" && (
      <article className="card">
        <h3>Onboarding Checklist</h3>
        {latestUser.status !== "approved" ? (
          <p className="muted">Onboarding opens after Hockey Ops approves your account.</p>
        ) : onboardingComplete ? (
          <div className="stack">
            <p className="badge">You have completed onboarding.</p>
            <p className="muted">
              Hockey Ops can now assign your teams, finalize jersey setup, and publish role access.
            </p>
          </div>
        ) : (
          <>
            <p className="muted">
              Complete this once after invite acceptance. Hockey Ops will use this to finalize team placement.
            </p>
            <form className="grid-form" action="/api/player/onboarding/complete" method="post">
              <h4>1) Contact Details</h4>
              <input name="addressLine1" placeholder="Address line 1" defaultValue={profileExtra.address?.line1 || ""} required />
              <input name="city" placeholder="City" defaultValue={profileExtra.address?.city || ""} required />
              <input name="stateProvince" placeholder="State" defaultValue={profileExtra.address?.stateProvince || ""} required />
              <input name="postalCode" placeholder="ZIP code" defaultValue={profileExtra.address?.postalCode || ""} required />
              <input name="usaHockeyNumber" placeholder="USA Hockey number (if available)" defaultValue={profileExtra.usaHockeyNumber || ""} />
              <label><input name="needsEquipment" type="checkbox" defaultChecked={Boolean(profileExtra.needsEquipment)} /> I need equipment support</label>

              <h4>2) Equipment Sizes</h4>
              <input name="helmet" placeholder="Helmet size" defaultValue={equipment.helmet || ""} />
              <input name="gloves" placeholder="Glove size" defaultValue={equipment.gloves || ""} />
              <input name="skates" placeholder="Skate size" defaultValue={equipment.skates || ""} />
              <input name="pants" placeholder="Pants size" defaultValue={equipment.pants || ""} />
              <input name="stick" placeholder="Stick specs" defaultValue={equipment.stick || ""} />
              <input name="jersey" placeholder="Jersey size" defaultValue={equipment.jersey || ""} />
              <input name="shell" placeholder="Shell size" defaultValue={equipment.shell || ""} />
              <input name="warmupTop" placeholder="Warmup top size" defaultValue={equipment.warmupTop || ""} />
              <input name="warmupBottom" placeholder="Warmup bottom size" defaultValue={equipment.warmupBottom || ""} />

              <h4>3) Acknowledgement</h4>
              <label>
                <input name="acknowledgementsCompleted" type="checkbox" required /> I confirm this information is accurate and can be used by Hockey Ops for rostering.
              </label>
              <button className="button" type="submit">Complete Onboarding</button>
            </form>
          </>
        )}
      </article>
      )}

      {section === "notifications" && (
      <article className="card">
        <h3>Notification Preferences</h3>
        <p className="muted">
          Choose what you want alerts for and how you want to receive them.
        </p>
        <form className="grid-form" action="/api/player/notifications" method="post">
          <h4>Delivery Channels</h4>
          <label><input name="channelEmail" type="checkbox" defaultChecked={notificationPref.channels.email} /> Email</label>
          <label><input name="channelSms" type="checkbox" defaultChecked={notificationPref.channels.sms} /> SMS</label>
          <label><input name="channelPush" type="checkbox" defaultChecked={notificationPref.channels.push} /> Push</label>

          <h4>Frequency</h4>
          <label>
            <select name="frequency" defaultValue={notificationPref.frequency}>
              <option value="immediate">Immediate</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
              <option value="off">Off</option>
            </select>
          </label>

          <h4>Categories</h4>
          <label><input name="catDvhl" type="checkbox" defaultChecked={notificationPref.categories.dvhl} /> DVHL updates</label>
          <label><input name="catNational" type="checkbox" defaultChecked={notificationPref.categories.national} /> National tournaments</label>
          <label><input name="catHockey" type="checkbox" defaultChecked={notificationPref.categories.hockey} /> Other hockey events</label>
          <label><input name="catOffIce" type="checkbox" defaultChecked={notificationPref.categories.off_ice} /> Off-ice events</label>
          <label><input name="catInterestDeadline" type="checkbox" defaultChecked={notificationPref.categories.interest_deadline} /> Interest deadline reminders</label>
          <label><input name="catRosterFinalized" type="checkbox" defaultChecked={notificationPref.categories.interest_roster_finalized} /> Final roster announcements</label>
          <label><input name="catGuestUpdates" type="checkbox" defaultChecked={notificationPref.categories.guest_updates} /> Guest request updates</label>
          <label><input name="catNews" type="checkbox" defaultChecked={notificationPref.categories.news} /> Program news</label>

          <button className="button" type="submit">Save Notification Preferences</button>
        </form>
      </article>
      )}

      {section === "profile" && (
      <>
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
      </>
      )}

      {section === "teams" && (
      <>
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
      </>
      )}

      {section === "events" && (
      <article className="card">
        <h3>My Events & RSVP Management</h3>
        {!canManageEvents ? (
          <p className="muted">Event RSVP tools unlock after player approval.</p>
        ) : (
          <div className="stack">
            {myUpcomingEvents.map((event) => {
              const myStatus = reservationBoards.viewerStatusByEvent[event.id] || "not_set";
              const signupConfig = signupConfigsByEvent[event.id];
              const isInterest = signupConfig?.signupMode === "interest_gathering";
              const isClosed = isInterest && isInterestSignupClosed(signupConfig);
              const isSelected = (rosterSelectionsByEvent[event.id]?.selectedUserIds || []).includes(latestUser.id);
              const guestIntent = (guestIntentsByEvent[event.id] || []).find((entry) => entry.userId === latestUser.id);
              const guestsAllowed = canEventCollectGuests(signupConfig, event.eventTypeName);
              const dvhl = isDvhlEvent(event.eventTypeName);
              return (
                <article key={event.id} className="event-card">
                  <strong>{event.title}</strong>
                  <p>{new Date(event.date).toLocaleString()}</p>
                  {event.locationPublic ? <p>{event.locationPublic}</p> : null}
                  <p className="muted">
                    Flow: {dvhl ? "DVHL straight sign-up" : isInterest ? "Interest gathering" : "Straight RSVP"}
                    {isInterest && signupConfig?.interestClosesAt
                      ? ` | Closes ${new Date(signupConfig.interestClosesAt).toLocaleString()}`
                      : ""}
                  </p>
                  {isInterest ? (
                    <p className="muted">
                      Final roster: {isSelected ? "You are selected" : "Selection pending / not selected yet"}
                    </p>
                  ) : null}
                  <p className="muted">Your RSVP: {myStatus.replaceAll("_", " ")}</p>
                  <form className="grid-form" action="/api/events/reservation" method="post">
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="returnTo" value="/player?section=events" />
                    <select name="status" defaultValue={myStatus === "not_set" ? "going" : myStatus} disabled={isClosed}>
                      <option value="going">Going</option>
                      <option value="maybe">Maybe</option>
                      <option value="not_going">Not going</option>
                    </select>
                    <input name="note" placeholder="Optional note" disabled={isClosed} />
                    <button className="button" type="submit" disabled={isClosed}>
                      {dvhl ? "Save DVHL Sign-Up" : isInterest ? "Save Interest" : "Save RSVP"}
                    </button>
                  </form>
                  {isClosed ? (
                    <p className="muted">Interest submissions are closed for this event.</p>
                  ) : null}
                  {guestsAllowed ? (
                    <form className="grid-form" action="/api/events/guest-intent" method="post">
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="returnTo" value="/player?section=events" />
                      <label>
                        Bringing a guest?
                        <select name="wantsGuest" defaultValue={guestIntent?.wantsGuest ? "yes" : "no"}>
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </label>
                      <label>
                        Guest count
                        <input
                          name="guestCount"
                          type="number"
                          min={1}
                          step={1}
                          defaultValue={guestIntent?.guestCount || 1}
                        />
                      </label>
                      <input name="guestNote" placeholder="Optional guest note" defaultValue={guestIntent?.note || ""} />
                      {signupConfig?.guestCostEnabled ? (
                        <p className="muted">
                          {signupConfig?.guestCostLabel || "Guest fee"}{" "}
                          {typeof signupConfig?.guestCostAmountUsd === "number"
                            ? `($${signupConfig.guestCostAmountUsd.toFixed(2)} per guest)`
                            : ""}
                        </p>
                      ) : null}
                      <button className="button ghost" type="submit">Save Guest Request</button>
                    </form>
                  ) : null}
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
      )}

      {section === "dvhl" && (
      <article className="card">
        <h3>DVHL Hub</h3>
        <p className="muted">
          Use the dedicated DVHL view for team assignments, standings, schedule, and sub volunteer management.
        </p>
        <p>
          <Link className="button" href="/player/dvhl">
            Open DVHL Hub
          </Link>
        </p>
      </article>
      )}

      {section === "gear" && (
      <>
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
      </>
      )}
        </div>
      </div>
    </section>
  );
}
