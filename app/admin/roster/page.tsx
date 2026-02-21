import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { listCentralRosterPlayers } from "@/lib/hq/roster";
import { listSportsData } from "@/lib/hq/ops-data";
import { listCompetitions } from "@/lib/hq/competitions";
import { listRosterReservations } from "@/lib/hq/roster-reservations";
import {
  listPendingJerseyNumberRequests,
  listPendingPhotoSubmissionRequests
} from "@/lib/hq/player-requests";
import {
  listAllTeamAssignments,
  listPlayerProfileExtras,
  listUsaHockeyRenewalCandidates,
  usaHockeySeasonLabel
} from "@/lib/hq/player-profiles";
import { listOnboardingChecklistByUserIds } from "@/lib/hq/onboarding";

export const dynamic = "force-dynamic";

type SortField = "name" | "number" | "roster" | "activity" | "updated";
type SortDir = "asc" | "desc";
type ActivityFilter = "all" | "active" | "inactive";
const PRIMARY_SUB_ROSTER_OPTIONS = ["gold", "white", "black"] as const;
const MAIN_ROSTER_OPTIONS = [{ id: "main-player-roster", label: "Main Player Roster" }];

export default async function CentralRosterPage({
  searchParams
}: {
  searchParams?: {
    sort?: string;
    dir?: string;
    saved?: string;
    deleted?: string;
    error?: string;
    conflictPlayer?: string;
    sharedTournaments?: string;
    q?: string;
    activity?: string;
    request?: string;
    assignmentDeleted?: string;
    usaStatus?: string;
    usaRollover?: string;
    usaSeason?: string;
    usaUpdated?: string;
    legacyMigrated?: string;
    onboardingCheck?: string;
  };
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?error=sign_in_required");
  }

  if (!(await canAccessAdminPanel(user))) {
    redirect("/player?error=admin_required");
  }

  const query = searchParams ?? {};
  const sort = (["name", "number", "roster", "activity", "updated"] as const).includes(
    query.sort as SortField
  )
    ? (query.sort as SortField)
    : "name";
  const dir: SortDir = query.dir === "desc" ? "desc" : "asc";
  const q = String(query.q ?? "").trim();
  const qLower = q.toLowerCase();
  const activity: ActivityFilter = ["all", "active", "inactive"].includes(query.activity ?? "")
    ? (query.activity as ActivityFilter)
    : "all";

  const [players, pendingPhotoRequests, pendingJerseyRequests, teamAssignments, profileExtras, renewalCandidates, sportsData, rosterReservations, competitions] = await Promise.all([
    listCentralRosterPlayers(),
    listPendingPhotoSubmissionRequests(),
    listPendingJerseyNumberRequests(),
    listAllTeamAssignments(),
    listPlayerProfileExtras(),
    listUsaHockeyRenewalCandidates(),
    listSportsData(),
    listRosterReservations(),
    listCompetitions()
  ]);
  const playersById = new Map(players.map((entry) => [entry.id, entry]));
  const onboarding = await listOnboardingChecklistByUserIds(players.map((entry) => entry.id));
  const currentUsaSeason = usaHockeySeasonLabel();
  const profileExtraByUserId = new Map(profileExtras.map((entry) => [entry.userId, entry]));
  const assignmentsByUserId = teamAssignments.reduce((acc, assignment) => {
    const list = acc.get(assignment.userId) ?? [];
    list.push(assignment);
    acc.set(assignment.userId, list);
    return acc;
  }, new Map<string, typeof teamAssignments>());
  const reservedEmails = new Set(
    rosterReservations
      .map((entry) => (entry.email || "").trim().toLowerCase())
      .filter(Boolean)
  );
  const rosterReadyContacts = sportsData.contactLeads.filter((lead) => {
    const email = (lead.email || "").trim().toLowerCase();
    if (!email) return false;
    return !reservedEmails.has(email);
  });
  const competitionTeamOptions = competitions.flatMap((competition) =>
    competition.teams.map((team) => ({
      competitionId: competition.id,
      competitionTitle: competition.title,
      competitionType: competition.type,
      teamId: team.id,
      teamName: team.name
    }))
  );
  const filtered = players.filter((player) => {
    if (activity !== "all" && player.activityStatus !== activity) {
      return false;
    }

    if (!qLower) {
      return true;
    }

    return [
      player.fullName,
      player.email,
      player.rosterId ?? "",
      player.jerseyNumber?.toString() ?? ""
    ]
      .join(" ")
      .toLowerCase()
      .includes(qLower);
  });

  const sorted = [...filtered].sort((a, b) => {
    const factor = dir === "asc" ? 1 : -1;

    if (sort === "name") {
      return a.fullName.localeCompare(b.fullName) * factor;
    }

    if (sort === "number") {
      return ((a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)) * factor;
    }

    if (sort === "roster") {
      return (a.rosterId ?? "zz").localeCompare(b.rosterId ?? "zz") * factor;
    }

    if (sort === "activity") {
      return a.activityStatus.localeCompare(b.activityStatus) * factor;
    }

    return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * factor;
  });

  const activeRoster = sorted.filter((player) => player.activityStatus === "active");
  const inactiveRoster = sorted.filter((player) => player.activityStatus === "inactive");
  const paramsBase = new URLSearchParams();
  if (q) {
    paramsBase.set("q", q);
  }
  if (activity !== "all") {
    paramsBase.set("activity", activity);
  }

  const nextDir = (field: SortField) => (sort === field && dir === "asc" ? "desc" : "asc");
  const sortHref = (field: SortField) => {
    const params = new URLSearchParams(paramsBase);
    params.set("sort", field);
    params.set("dir", nextDir(field));
    return `/admin/roster?${params.toString()}`;
  };

  const exportParams = new URLSearchParams(paramsBase);
  const exportHref = `/api/admin/roster/export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`;

  return (
    <section className="stack">
      <article className="card">
        <h2>Central Roster Management</h2>
        <p>
          <Link href="/admin?section=players">Back to Admin Players Tab</Link>
        </p>
        <div className="cta-row">
          <a className="button ghost" href={exportHref}>
            Export CSV (Current Filter)
          </a>
          <span className="badge">Total: {sorted.length}</span>
          <span className="badge">Active: {activeRoster.length}</span>
          <span className="badge">Inactive: {inactiveRoster.length}</span>
          <span className="badge">
            USA Hockey renewals ({currentUsaSeason}): {renewalCandidates.length}
          </span>
        </div>
        <form className="grid-form" action="/admin/roster" method="get">
          <input name="q" placeholder="Search name, email, roster, number" defaultValue={q} />
          <label>
            Activity filter
            <select name="activity" defaultValue={activity}>
              <option value="all">All players</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </label>
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />
          <button className="button" type="submit">Apply Filter</button>
        </form>
        {query.saved === "1" && <p className="badge">Player record updated.</p>}
        {query.deleted === "1" && <p className="badge">Player deleted.</p>}
        {query.assignmentDeleted === "1" && <p className="badge">Team assignment removed.</p>}
        {query.usaStatus === "updated" && <p className="badge">USA Hockey status updated.</p>}
        {query.onboardingCheck === "saved" && <p className="badge">Onboarding checklist updated.</p>}
        {query.legacyMigrated && (
          <p className="badge">Legacy roster IDs migrated to Main Player Roster: {query.legacyMigrated}</p>
        )}
        {query.usaRollover === "1" && (
          <p className="badge">
            USA Hockey rollover complete for {query.usaSeason || currentUsaSeason}. Updated {query.usaUpdated || "0"} profiles.
          </p>
        )}
        {query.request === "approved" && <p className="badge">Request approved.</p>}
        {query.request === "rejected" && <p className="badge">Request rejected.</p>}
        {query.error && (
          <p className="muted">
            {query.error === "number_conflict"
              ? `Number conflict: already assigned to ${query.conflictPlayer ?? "another player"}. Only force overlap if players will not be rostered together in tournaments.`
              : query.error === "shared_tournament_overlap"
              ? `Cannot force number overlap. ${query.conflictPlayer ?? "This player"} shares tournament history with this player: ${query.sharedTournaments ?? "Unknown tournament"}.`
              : query.error === "primary_sub_roster_required"
              ? "Primary sub-roster is required (Gold, White, or Black)."
              : query.error === "headshot_upload_required"
              ? "External photo URLs are disabled. Use Upload Headshot so photos are stored on this website."
              : query.error.replaceAll("_", " ")}
          </p>
        )}
        <form action="/api/admin/roster/migrate-legacy" method="post">
          <button className="button alt" type="submit">
            Migrate Legacy Roster IDs to Main + Sub-Roster
          </button>
        </form>
      </article>

      <article className="card">
        <h3>Simple Player Placement Flow</h3>
        <ol>
          <li>In each player row, use <strong>Main + Sub-Roster Assignment</strong> to set jersey number and color roster (Gold/White/Black) in one save.</li>
          <li>Use <strong>Add Team Assignment</strong> to place them onto season/session/team structures (DVHL, tournaments, etc.).</li>
          <li>Upload headshots with <strong>Upload Headshot</strong>. External image URLs are disabled.</li>
        </ol>
        <div className="cta-row">
          <Link className="button ghost" href="/admin?section=contacts">
            Open Contacts Queue Wizard
          </Link>
          <Link className="button ghost" href="/admin?section=players">
            Open Players Hub
          </Link>
        </div>
      </article>

      <article className="card">
        <h3>Add Imported Contact To Main Roster</h3>
        <p className="muted">
          Select an imported contact, choose sub-roster, and lock jersey number now. No manual typing required.
        </p>
        <form className="grid-form" action="/api/admin/contacts/add-to-roster" method="post">
          <input type="hidden" name="returnTo" value="/admin/roster" />
          <label>
            Imported contact
            <select name="contactLeadId" defaultValue="" required>
              <option value="" disabled>Select contact</option>
              {rosterReadyContacts.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {(lead.fullName || lead.email || lead.id)}{lead.email ? ` (${lead.email})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Primary sub-roster
            <select name="primarySubRoster" defaultValue="" required>
              <option value="" disabled>Select color roster</option>
              {PRIMARY_SUB_ROSTER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            Jersey number (optional)
            <input name="jerseyNumber" type="number" min="1" max="99" placeholder="Auto-assigned if blank" />
          </label>
          <button className="button" type="submit">Add Contact To Main Roster</button>
        </form>
        <details className="event-card admin-disclosure">
          <summary>One-Click Invite + Link + Promote + Roster</summary>
          <p className="muted">
            This sends invite, links account, promotes to player, and adds to main roster in one action.
          </p>
          <form className="grid-form" action="/api/admin/contacts/queue-progress" method="post">
            <input type="hidden" name="returnTo" value="/admin/roster" />
            <input type="hidden" name="action" value="full" />
            <label>
              Imported contact
              <select name="contactLeadIds" defaultValue="" required>
                <option value="" disabled>Select contact</option>
                {rosterReadyContacts.map((lead) => (
                  <option key={`${lead.id}-full`} value={lead.id}>
                    {(lead.fullName || lead.email || lead.id)}{lead.email ? ` (${lead.email})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Primary sub-roster
              <select name="primarySubRoster" defaultValue="" required>
                <option value="" disabled>Select color roster</option>
                {PRIMARY_SUB_ROSTER_OPTIONS.map((option) => (
                  <option key={`${option}-full`} value={option}>
                    {option.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <button className="button" type="submit">Run Full Player Onboarding Pipeline</button>
          </form>
        </details>
        {rosterReadyContacts.length === 0 ? (
          <p className="muted">No imported contacts pending roster lock.</p>
        ) : null}
      </article>

      <article className="card">
        <h3>USA Hockey Compliance</h3>
        <form className="grid-form" action="/api/admin/usa-hockey/rollover" method="post">
          <label>
            Active season
            <input name="season" defaultValue={currentUsaSeason} />
          </label>
          <button className="button" type="submit">Run Season Rollover</button>
        </form>
        <p className="muted">
          Rollover marks stale records as pending renewal for the selected season.
        </p>

        <div className="stack">
          {renewalCandidates.length === 0 ? (
            <p className="muted">No renewal candidates for {currentUsaSeason}.</p>
          ) : (
            renewalCandidates.map((candidate) => {
              const player = playersById.get(candidate.userId);
              return (
                <div key={candidate.userId} className="event-card">
                  <strong>{player?.fullName ?? candidate.userId}</strong>
                  <p>{player?.email ?? "No email on file"}</p>
                  <p>
                    Number: {candidate.usaHockeyNumber || "Missing"} | Season: {candidate.usaHockeySeason || "Missing"} |
                    Status: {candidate.usaHockeyStatus || "unverified"}
                  </p>
                  <div className="cta-row">
                    <form action="/api/admin/usa-hockey/status" method="post">
                      <input type="hidden" name="userId" value={candidate.userId} />
                      <input type="hidden" name="status" value="verified" />
                      <input type="hidden" name="season" value={currentUsaSeason} />
                      <button className="button" type="submit" disabled={!candidate.usaHockeyNumber}>
                        Mark Verified
                      </button>
                    </form>
                    <form action="/api/admin/usa-hockey/status" method="post">
                      <input type="hidden" name="userId" value={candidate.userId} />
                      <input type="hidden" name="status" value="pending_renewal" />
                      <input type="hidden" name="season" value={currentUsaSeason} />
                      <button className="button ghost" type="submit">Set Pending Renewal</button>
                    </form>
                    <form action="/api/admin/usa-hockey/status" method="post">
                      <input type="hidden" name="userId" value={candidate.userId} />
                      <input type="hidden" name="status" value="expired" />
                      <input type="hidden" name="season" value={currentUsaSeason} />
                      <button className="button alt" type="submit">Mark Expired</button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </article>

      <article className="card">
        <h3>Pending Player Requests</h3>
        <div className="stack">
          <div className="event-card">
            <strong>Photo submissions ({pendingPhotoRequests.length})</strong>
            {pendingPhotoRequests.length === 0 ? (
              <p className="muted">No pending photo requests.</p>
            ) : (
              <div className="stack">
                {pendingPhotoRequests.map((entry) => {
                  const player = playersById.get(entry.userId);
                  return (
                    <div key={entry.id} className="event-card">
                      <p>
                        <strong>{player?.fullName ?? entry.userId}</strong> submitted{" "}
                        {new Date(entry.createdAt).toLocaleString()}
                      </p>
                      <p>
                        <a href={entry.imageUrl} target="_blank" rel="noreferrer">
                          Review submitted photo
                        </a>
                      </p>
                      <form className="grid-form" action="/api/admin/roster/requests/photo/review" method="post">
                        <input type="hidden" name="requestId" value={entry.id} />
                        <input name="reviewNotes" placeholder="Optional decision notes" />
                        <div className="cta-row">
                          <button className="button" type="submit" name="decision" value="approved">
                            Approve and set official
                          </button>
                          <button className="button alt" type="submit" name="decision" value="rejected">
                            Reject
                          </button>
                        </div>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="event-card">
            <strong>Jersey number requests ({pendingJerseyRequests.length})</strong>
            {pendingJerseyRequests.length === 0 ? (
              <p className="muted">No pending jersey requests.</p>
            ) : (
              <div className="stack">
                {pendingJerseyRequests.map((entry) => {
                  const player = playersById.get(entry.userId);
                  return (
                    <div key={entry.id} className="event-card">
                      <p>
                        <strong>{player?.fullName ?? entry.userId}</strong> requested #
                        {entry.requestedJerseyNumber} (current #{entry.currentJerseyNumber ?? "-"})
                      </p>
                      <p className="muted">
                        Roster: {entry.rosterId} | Sub-roster: {entry.primarySubRoster || "unassigned"} | Submitted:{" "}
                        {new Date(entry.createdAt).toLocaleString()}
                      </p>
                      {entry.approvalReason ? <p className="muted">{entry.approvalReason}</p> : null}
                      <form className="grid-form" action="/api/admin/roster/requests/jersey/review" method="post">
                        <input type="hidden" name="requestId" value={entry.id} />
                        <input name="reviewNotes" placeholder="Optional decision notes" />
                        <div className="cta-row">
                          <button className="button" type="submit" name="decision" value="approved">
                            Approve and apply number
                          </button>
                          <button className="button alt" type="submit" name="decision" value="rejected">
                            Reject
                          </button>
                        </div>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </article>

      <article className="card">
        <h3>Active Roster Snapshot</h3>
        <div className="stack">
          {activeRoster.map((player) => (
            <div key={player.id} className="event-card">
              <strong>{player.fullName}</strong>
              <p>#{player.jerseyNumber ?? "-"} | {player.rosterId ?? "No roster"}</p>
            </div>
          ))}
          {activeRoster.length === 0 && <p className="muted">No active players.</p>}
        </div>
      </article>

      <article className="card">
        <h3>Sortable Roster Table</h3>
        <table>
          <thead>
            <tr>
              <th><Link href={sortHref("name")}>Name</Link></th>
              <th>Email</th>
              <th><Link href={sortHref("number")}>#</Link></th>
              <th><Link href={sortHref("roster")}>Roster</Link></th>
              <th><Link href={sortHref("activity")}>Active?</Link></th>
              <th>History</th>
              <th><Link href={sortHref("updated")}>Updated</Link></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player) => (
              <tr key={player.id}>
                <td>
                  <form className="grid-form" action="/api/admin/roster/assign" method="post">
                    <input type="hidden" name="userId" value={player.id} />
                    <input type="hidden" name="fullName" value={player.fullName} />
                    <strong>Main + Sub-Roster Assignment</strong>
                    <p className="muted">
                      One-step placement: Main roster is fixed to Main Player Roster.
                    </p>
                    <label>
                      Main roster
                      <select name="rosterId" defaultValue={player.rosterId ?? "main-player-roster"}>
                        {MAIN_ROSTER_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Primary sub-roster
                      <select
                        name="primarySubRoster"
                        defaultValue={profileExtraByUserId.get(player.id)?.primarySubRoster ?? ""}
                        required
                      >
                        <option value="" disabled>Select color roster</option>
                        {PRIMARY_SUB_ROSTER_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Official jersey number
                      <input
                        name="jerseyNumber"
                        type="number"
                        min="1"
                        max="99"
                        defaultValue={player.jerseyNumber ?? ""}
                        placeholder="Jersey #"
                      />
                    </label>
                    <label>
                      Activity
                      <select name="activityStatus" defaultValue={player.activityStatus}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        name="allowCrossColorJerseyOverlap"
                        defaultChecked={Boolean(profileExtraByUserId.get(player.id)?.allowCrossColorJerseyOverlap)}
                      />{" "}
                      Allow cross-color jersey overlap (gold/black policy)
                    </label>
                    <label>
                      <input type="checkbox" name="forceNumberOverlap" /> Allow manual number overlap override
                    </label>
                    <button className="button" type="submit">Save Placement</button>
                  </form>

                  <details className="event-card admin-disclosure">
                    <summary>Identity + Account</summary>
                    <form className="grid-form" action={`/api/admin/users/${player.id}/identity`} method="post">
                    <strong>Identity + Account</strong>
                    <label>
                      Full name
                      <input name="fullName" defaultValue={player.fullName} required />
                    </label>
                    <label>
                      Email
                      <input name="email" type="email" defaultValue={player.email} required />
                    </label>
                    <label>
                      Phone
                      <input name="phone" placeholder="Phone" defaultValue={player.phone ?? ""} />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        name="needsEquipment"
                        defaultChecked={Boolean(profileExtraByUserId.get(player.id)?.needsEquipment)}
                      />{" "}
                      Needs equipment support
                    </label>
                    <label>
                      Preferred position
                      <input name="requestedPosition" placeholder="Primary position" defaultValue={player.requestedPosition ?? ""} />
                    </label>
                    <label>
                      Address line 1
                      <input name="addressLine1" defaultValue={profileExtraByUserId.get(player.id)?.address?.line1 ?? ""} />
                    </label>
                    <label>
                      Address line 2
                      <input name="addressLine2" defaultValue={profileExtraByUserId.get(player.id)?.address?.line2 ?? ""} />
                    </label>
                    <label>
                      City
                      <input name="city" defaultValue={profileExtraByUserId.get(player.id)?.address?.city ?? ""} />
                    </label>
                    <label>
                      State/Province
                      <input name="stateProvince" defaultValue={profileExtraByUserId.get(player.id)?.address?.stateProvince ?? ""} />
                    </label>
                    <label>
                      ZIP/Postal code
                      <input name="postalCode" defaultValue={profileExtraByUserId.get(player.id)?.address?.postalCode ?? ""} />
                    </label>
                    <label>
                      Country
                      <input name="country" defaultValue={profileExtraByUserId.get(player.id)?.address?.country ?? ""} />
                    </label>
                    <label>
                      Primary sub-roster
                      <select
                        name="primarySubRoster"
                        defaultValue={profileExtraByUserId.get(player.id)?.primarySubRoster ?? ""}
                      >
                        <option value="">Not assigned</option>
                        {PRIMARY_SUB_ROSTER_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        name="allowCrossColorJerseyOverlap"
                        defaultChecked={Boolean(profileExtraByUserId.get(player.id)?.allowCrossColorJerseyOverlap)}
                      />{" "}
                      Allow cross-color jersey overlap (gold/black policy)
                    </label>
                    <label>
                      USA Hockey #
                      <input name="usaHockeyNumber" defaultValue={profileExtraByUserId.get(player.id)?.usaHockeyNumber ?? ""} />
                    </label>
                    <label>
                      USA Hockey season (YYYY-YYYY)
                      <input name="usaHockeySeason" defaultValue={profileExtraByUserId.get(player.id)?.usaHockeySeason ?? ""} />
                    </label>
                    <label>
                      USA Hockey status
                      <select name="usaHockeyStatus" defaultValue={profileExtraByUserId.get(player.id)?.usaHockeyStatus ?? "unverified"}>
                        <option value="unverified">Unverified</option>
                        <option value="verified">Verified</option>
                        <option value="pending_renewal">Pending renewal</option>
                        <option value="expired">Expired</option>
                      </select>
                    </label>
                    <label>
                      USA Hockey expires
                      <input name="usaHockeyExpiresAt" type="date" defaultValue={profileExtraByUserId.get(player.id)?.usaHockeyExpiresAt?.slice(0, 10) ?? ""} />
                    </label>
                    <label>
                      Reset password (optional)
                      <input name="newPassword" type="password" placeholder="Temporary or reset password" />
                    </label>
                    <button className="button ghost" type="submit">Save Identity</button>
                    </form>
                  </details>

                  <details className="event-card admin-disclosure">
                    <summary>Onboarding Checklist</summary>
                    <div className="stack">
                      {onboarding.template.map((item) => {
                        const completion = onboarding.completionMap[player.id]?.[item.id];
                        return (
                          <form
                            key={`${player.id}-${item.id}`}
                            className="grid-form"
                            action="/api/admin/onboarding/check-item"
                            method="post"
                          >
                            <input type="hidden" name="userId" value={player.id} />
                            <input type="hidden" name="checklistItemId" value={item.id} />
                            <input type="hidden" name="completed" value={completion?.completed ? "0" : "1"} />
                            <input type="hidden" name="returnTo" value="/admin/roster" />
                            <p>
                              <strong>{item.label}</strong>
                            </p>
                            <p className="muted">
                              Status: {completion?.completed ? "Completed" : "Not completed"}
                              {completion?.updatedAt
                                ? ` | Updated ${new Date(completion.updatedAt).toLocaleString()}`
                                : ""}
                            </p>
                            <input name="note" placeholder="Optional audit note" defaultValue={completion?.note || ""} />
                            <button className="button ghost" type="submit">
                              {completion?.completed ? "Mark Incomplete" : "Mark Complete"}
                            </button>
                          </form>
                        );
                      })}
                      {(onboarding.auditMap[player.id] || []).length > 0 ? (
                        <div className="event-card">
                          <strong>Recent checklist audit</strong>
                          <ul>
                            {(onboarding.auditMap[player.id] || []).slice(0, 6).map((entry) => (
                              <li key={entry.id}>
                                {entry.action} {entry.checklistItemId} at {new Date(entry.updatedAt).toLocaleString()}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </details>

                  <details className="event-card admin-disclosure">
                    <summary>Legacy Roster Profile Editor</summary>
                    <form className="grid-form" action="/api/admin/roster/update" method="post">
                    <input type="hidden" name="userId" value={player.id} />
                    <input type="hidden" name="fullName" value={player.fullName} />
                    <strong>Legacy Roster Profile Editor</strong>
                    <label>
                      Main roster
                      <select name="rosterId" defaultValue={player.rosterId ?? "main-player-roster"}>
                        {MAIN_ROSTER_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Official jersey number
                      <input
                        name="jerseyNumber"
                        type="number"
                        min="1"
                        max="99"
                        defaultValue={player.jerseyNumber ?? ""}
                        placeholder="Jersey #"
                      />
                    </label>
                    <label>
                      Activity
                      <select name="activityStatus" defaultValue={player.activityStatus}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </label>
                    <label>
                      <input type="checkbox" name="forceNumberOverlap" /> Allow manual number overlap override
                    </label>
                    <button className="button" type="submit">Save Roster Profile</button>
                    </form>
                  </details>

                  <details className="event-card admin-disclosure">
                    <summary>Team Assignment Tools</summary>
                    <form className="grid-form" action="/api/admin/team-assignments/quick-save" method="post">
                    <input type="hidden" name="userId" value={player.id} />
                    <input type="hidden" name="returnTo" value="/admin/roster" />
                    <strong>Quick Assign From Existing Teams</strong>
                    <label>
                      Team
                      <select name="teamId" defaultValue="" required>
                        <option value="" disabled>Select team</option>
                        {competitionTeamOptions.map((option) => (
                          <option key={`${option.competitionId}-${option.teamId}`} value={option.teamId}>
                            {option.competitionTitle} | {option.teamName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Assignment status
                      <select name="status" defaultValue="active">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive/Archived</option>
                      </select>
                    </label>
                    <button className="button ghost" type="submit" disabled={competitionTeamOptions.length === 0}>
                      Quick Add Assignment
                    </button>
                    {competitionTeamOptions.length === 0 ? (
                      <p className="muted">No competition teams found yet. Add DVHL/tournament teams first.</p>
                    ) : null}
                    </form>

                    <form className="grid-form" action="/api/admin/team-assignments/save" method="post">
                    <input type="hidden" name="userId" value={player.id} />
                    <strong>Add Team Assignment</strong>
                    <input name="assignmentType" placeholder="Type (season, tournament, DVHL, custom)" required />
                    <input name="seasonLabel" placeholder="Season label (e.g. 2025-2026)" />
                    <input name="sessionLabel" placeholder="Session (e.g. Session 2)" />
                    <input name="subRosterLabel" placeholder="Sub-roster (e.g. Warrior Classic)" />
                    <input name="teamName" placeholder="Team (e.g. Gold, Khe Sahn)" required />
                    <label>
                      Starts
                      <input name="startsAt" type="date" />
                    </label>
                    <label>
                      Ends
                      <input name="endsAt" type="date" />
                    </label>
                    <label>
                      Status
                      <select name="status" defaultValue="active">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive/Archived</option>
                      </select>
                    </label>
                    <input name="notes" placeholder="Notes" />
                    <button className="button ghost" type="submit">Add Assignment</button>
                    </form>

                    {(assignmentsByUserId.get(player.id) ?? []).length > 0 ? (
                      <details className="event-card admin-disclosure">
                        <summary>Team assignments ({(assignmentsByUserId.get(player.id) ?? []).length})</summary>
                        <div className="stack">
                          {(assignmentsByUserId.get(player.id) ?? []).map((assignment) => (
                            <div className="event-card" key={assignment.id}>
                              <form className="grid-form" action="/api/admin/team-assignments/save" method="post">
                                <input type="hidden" name="assignmentId" value={assignment.id} />
                                <input type="hidden" name="userId" value={player.id} />
                                <input name="assignmentType" defaultValue={assignment.assignmentType} required />
                                <input name="seasonLabel" defaultValue={assignment.seasonLabel ?? ""} placeholder="Season" />
                                <input name="sessionLabel" defaultValue={assignment.sessionLabel ?? ""} placeholder="Session" />
                                <input name="subRosterLabel" defaultValue={assignment.subRosterLabel ?? ""} placeholder="Sub-roster" />
                                <input name="teamName" defaultValue={assignment.teamName} required />
                                <label>
                                  Starts
                                  <input
                                    name="startsAt"
                                    type="date"
                                    defaultValue={assignment.startsAt ? assignment.startsAt.slice(0, 10) : ""}
                                  />
                                </label>
                                <label>
                                  Ends
                                  <input
                                    name="endsAt"
                                    type="date"
                                    defaultValue={assignment.endsAt ? assignment.endsAt.slice(0, 10) : ""}
                                  />
                                </label>
                                <label>
                                  Status
                                  <select name="status" defaultValue={assignment.status}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive/Archived</option>
                                  </select>
                                </label>
                                <input name="notes" defaultValue={assignment.notes ?? ""} placeholder="Notes" />
                                <button className="button ghost" type="submit">Save Assignment</button>
                              </form>
                              <form className="grid-form" action="/api/admin/team-assignments/delete" method="post">
                                <input type="hidden" name="assignmentId" value={assignment.id} />
                                <button className="button alt" type="submit">Remove Assignment</button>
                              </form>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : (
                      <p className="muted">No team assignments saved yet.</p>
                    )}
                  </details>

                  <form className="grid-form" action="/api/admin/roster/photos/upload" method="post" encType="multipart/form-data">
                    <input type="hidden" name="userId" value={player.id} />
                    <input name="photoFile" type="file" accept="image/*" required />
                    <input name="caption" placeholder="Caption (optional)" />
                    <label>
                      <input type="checkbox" name="makePrimary" defaultChecked /> Set as primary photo
                    </label>
                    <button className="button ghost" type="submit">Upload Headshot</button>
                  </form>
                  {player.photos.length > 0 && (
                    <div className="stack">
                      <p className="muted">Photo history ({player.photos.length})</p>
                      {player.photos.slice(0, 4).map((photo) => (
                        <div key={photo.id} className="event-card">
                          <img src={photo.imageUrl} alt={player.fullName} style={{ maxWidth: "160px", height: "auto", borderRadius: "8px" }} />
                          <p>{photo.isPrimary ? "Primary" : "Archived"} {photo.caption ? `| ${photo.caption}` : ""}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <form className="grid-form" action="/api/admin/roster/delete" method="post">
                    <input type="hidden" name="userId" value={player.id} />
                    <button className="button alt" type="submit">Delete Player</button>
                  </form>
                </td>
                <td>{player.email}</td>
                <td>{player.jerseyNumber ?? "-"}</td>
                <td>{player.rosterId ?? "-"}</td>
                <td>{player.activityStatus}</td>
                <td>
                  {player.competitionHistory.length > 0
                    ? player.competitionHistory.join(", ")
                    : "No team history yet"}
                </td>
                <td>{new Date(player.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No players match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </section>
  );
}
