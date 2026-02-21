import Link from "next/link";
import { redirect } from "next/navigation";
import { hasDatabaseUrl } from "@/lib/db-env";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { readStore } from "@/lib/hq/store";
import { getAllEvents, listEventTypes } from "@/lib/hq/events";
import { listAllNewsPosts } from "@/lib/hq/news";
import {
  canEventCollectGuests,
  getEventGuestIntentMap,
  getEventRosterSelectionMap,
  getEventSignupConfigMap,
  isInterestSignupClosed
} from "@/lib/hq/event-signups";
import {
  competitionTypeLabel,
  listCompetitions,
  listEligiblePlayers,
  listEligibleScorekeepers
} from "@/lib/hq/competitions";
import { listSportsData } from "@/lib/hq/ops-data";
import { summarizeAttendanceInsights } from "@/lib/hq/attendance-analytics";
import { listReservationBoards } from "@/lib/hq/reservations";
import { getDvhlTeamControlMap } from "@/lib/hq/dvhl";
import { listOnboardingChecklistTemplate } from "@/lib/hq/onboarding";
import {
  listOpsRoleAssignments,
  listOpsRoleDefinitions,
  userHasPermission
} from "@/lib/hq/permissions";
import {
  getDonationLedgerSummary,
  listDonationIntents,
  listDonationPayments
} from "@/lib/hq/donations";
import { listLocalShowcaseGalleries, listLocalShowcasePhotos } from "@/lib/showcase-photos";
import {
  listAnnouncementDeliveriesByAnnouncement,
  listAnnouncements,
  listAnnouncementViewsByAnnouncement
} from "@/lib/hq/announcements";
import { listPlayerProfileExtras } from "@/lib/hq/player-profiles";

export const dynamic = "force-dynamic";

const sectionDefs = [
  { key: "overview", label: "Command Center", permission: null },
  { key: "dvhl", label: "DVHL", permission: "manage_dvhl" },
  { key: "onice", label: "On-Ice Events", permission: "manage_events" },
  { key: "office", label: "Off-Ice Events", permission: "manage_events" },
  { key: "contacts", label: "Users & Applications", permission: "manage_site_users" },
  { key: "usermanagement", label: "User Management", permission: "manage_site_users" },
  { key: "announcements", label: "Announcements", permission: "manage_site_users" },
  { key: "players", label: "Roster & Roles", permission: "manage_players" },
  { key: "news", label: "News", permission: "manage_news" },
  { key: "media", label: "Media", permission: "manage_media" },
  { key: "sportsdata", label: "Directory", permission: "manage_site_users" },
  { key: "competitions", label: "Other Competitions", permission: "manage_events" },
  { key: "attendance", label: "Attendance", permission: "manage_events" },
  { key: "fundraising", label: "Fundraising", permission: "manage_fundraising" }
] as const;

type Section = (typeof sectionDefs)[number]["key"];

function isOnIceEventType(name?: string | null) {
  const value = String(name || "").toLowerCase();
  if (!value) return false;
  if (value.includes("dvhl")) return false;
  return (
    value.includes("hockey") ||
    value.includes("tournament") ||
    value.includes("game") ||
    value.includes("scrimmage") ||
    value.includes("practice")
  );
}

function isOffIceEventType(name?: string | null) {
  const value = String(name || "").toLowerCase();
  if (!value) return true;
  if (value.includes("dvhl")) return false;
  return !isOnIceEventType(name);
}

export default async function AdminPage({
  searchParams
}: {
  searchParams?: {
    section?: string;
    error?: string;
    approved?: string;
    rejected?: string;
    eventsaved?: string;
    eventupdated?: string;
    eventdeleted?: string;
    competition?: string;
    assignment?: string;
    game?: string;
    scorekeeper?: string;
    data?: string;
    contact?: string;
    userrole?: string;
    eventtype?: string;
    errorDetail?: string;
    imported?: string;
    updated?: string;
    skipped?: string;
    reservationlinked?: string;
    rosterselected?: string;
    onboardingTemplate?: string;
    onboardingCheck?: string;
    dvhl?: string;
    donation?: string;
    opsrole?: string;
    opsUpdated?: string;
    opsSkipped?: string;
    media?: string;
    news?: string;
    bulkLocked?: string;
    bulkSkipped?: string;
    bulkRoles?: string;
    bulkInvited?: string;
    queueInvited?: string;
    queueLinked?: string;
    queueProvisioned?: string;
    queuePromoted?: string;
    queueRostered?: string;
    queueSkipped?: string;
    usersCreated?: string;
    usersLinked?: string;
    usersSkipped?: string;
    generated?: string;
    contactSearch?: string;
    announcement?: string;
    sent?: string;
    failed?: string;
    queued?: string;
  };
}) {
  const query = searchParams ?? {};
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?error=sign_in_required");
  }

  if (!(await canAccessAdminPanel(user))) {
    redirect("/player?error=admin_required");
  }

  const permissionFlags = {
    manage_players: await userHasPermission(user, "manage_players"),
    manage_events: await userHasPermission(user, "manage_events"),
    manage_dvhl: await userHasPermission(user, "manage_dvhl"),
    manage_site_users: await userHasPermission(user, "manage_site_users"),
    manage_fundraising: await userHasPermission(user, "manage_fundraising"),
    manage_news: await userHasPermission(user, "manage_news"),
    manage_media: await userHasPermission(user, "manage_media")
  } as const;

  const visibleSectionDefs = sectionDefs.filter((entry) => {
    if (!entry.permission) return true;
    return permissionFlags[entry.permission];
  });
  const defaultSection = (visibleSectionDefs[0]?.key || "overview") as Section;
  const requestedRawSection = String(query.section || "");
  const requestedSection = requestedRawSection === "events" ? "onice" : requestedRawSection;
  const section: Section = visibleSectionDefs.some((entry) => entry.key === requestedSection)
    ? (requestedSection as Section)
    : defaultSection;

  const [store, allEvents, eventTypes, competitions, eligiblePlayers, eligibleScorekeepers, sportsData, attendanceInsights, newsPosts, showcasePhotos, showcaseGalleries, announcements, playerProfileExtras] = await Promise.all([
    readStore(),
    getAllEvents(),
    listEventTypes(),
    listCompetitions(),
    listEligiblePlayers(),
    listEligibleScorekeepers(),
    listSportsData(),
    summarizeAttendanceInsights(),
    listAllNewsPosts(),
    listLocalShowcasePhotos(),
    listLocalShowcaseGalleries(),
    listAnnouncements({ includeExpired: true, limit: 100 }),
    listPlayerProfileExtras()
  ]);
  const onboardingTemplate = await listOnboardingChecklistTemplate();
  const roleDefinitions = listOpsRoleDefinitions();
  const roleAssignments = await listOpsRoleAssignments();
  const donationIntents = await listDonationIntents();
  const donationPayments = await listDonationPayments();
  const donationLedgerSummary = await getDonationLedgerSummary();
  const actorIsSuperAdmin = await userHasPermission(user, "assign_ops_roles");
  const dvhlTeamControlByTeamId = await getDvhlTeamControlMap(
    competitions
      .filter((competition) => competition.type === "DVHL")
      .flatMap((competition) => competition.teams.map((team) => team.id))
  );
  const [reservationBoards, signupConfigsByEvent, rosterSelectionsByEvent, guestIntentsByEvent] = await Promise.all([
    listReservationBoards(allEvents.map((event) => event.id)),
    getEventSignupConfigMap(allEvents.map((event) => event.id)),
    getEventRosterSelectionMap(allEvents.map((event) => event.id)),
    getEventGuestIntentMap(allEvents.map((event) => event.id))
  ]);

  const pendingUsers = store.users.filter((entry) => entry.status === "pending");
  const approvedPlayers = store.users.filter(
    (entry) => entry.status === "approved" && entry.role === "player"
  );
  const nonPlayerUsers = store.users.filter((entry) => entry.role !== "player");
  const rejectedUsers = store.users.filter((entry) => entry.status === "rejected");
  const roleAssignmentsByUserId = roleAssignments.reduce((acc, assignment) => {
    const list = acc.get(assignment.userId) ?? [];
    list.push(assignment);
    acc.set(assignment.userId, list);
    return acc;
  }, new Map<string, typeof roleAssignments>());
  const profileExtraByUserId = new Map(playerProfileExtras.map((entry) => [entry.userId, entry]));

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
    query.eventupdated === "1" ? "Event updated." : null,
    query.eventdeleted === "1" ? "Event deleted." : null,
    query.competition === "created" ? "Competition created." : null,
    query.assignment === "saved" ? "Player assigned to competition team." : null,
    query.game === "created" ? "Competition game created." : null,
    query.scorekeeper === "saved" ? "Game scorekeeper updated." : null,
    query.data === "season_created" ? "Season created." : null,
    query.data === "team_created" ? "Team created." : null,
    query.data === "venue_created" ? "Venue created." : null,
    query.data === "position_created" ? "Position created." : null,
    query.data === "staff_created" ? "Staff profile created." : null,
    query.data === "sponsor_created" ? "Sponsor created." : null,
    query.contact === "linked" ? "Contact linked to existing user account." : null,
    query.contact === "invite_sent" ? "Invite email sent from configured HQ mailbox." : null,
    query.userrole === "updated" ? "User role updated." : null,
    query.eventtype === "created" ? "Event type created." : null,
    query.reservationlinked === "1" ? "Reservation linked to player account." : null,
    query.rosterselected === "1"
      ? query.generated === "1"
        ? "Final roster generated from interest list and notifications sent."
        : "Final roster selection saved."
      : null,
    query.onboardingTemplate === "updated" ? "Onboarding checklist template updated." : null,
    query.onboardingCheck === "saved" ? "Onboarding checklist item updated." : null,
    query.dvhl === "captain_saved" ? "DVHL captain assignment saved." : null,
    query.dvhl === "subpool_saved" ? "DVHL sub pool updated." : null,
    query.donation === "saved" ? "Donation record updated." : null,
    query.opsrole === "updated" ? "Ops role assignment updated." : null,
    query.opsUpdated ? `Ops roles updated: ${query.opsUpdated}` : null,
    query.opsSkipped ? `Ops updates skipped: ${query.opsSkipped}` : null,
    query.media === "saved" ? "Showcase media uploaded." : null,
    query.media === "deleted" ? "Showcase media deleted." : null,
    query.news === "saved" ? "News post created." : null,
    query.news === "updated" ? "News post updated." : null,
    query.news === "deleted" ? "News post deleted." : null,
    query.announcement === "created" ? "Announcement created." : null,
    query.announcement === "updated" ? "Announcement updated." : null,
    query.announcement === "deleted" ? "Announcement deleted." : null,
    query.announcement === "sent"
      ? `Announcement delivery processed: sent ${query.sent || "0"}, queued ${query.queued || "0"}, failed ${query.failed || "0"}.`
      : null
  ].filter(Boolean) as string[];

  const snapshotItems = [
    { label: "Pending", value: pendingUsers.length, href: "/admin?section=contacts" },
    { label: "Approved", value: approvedPlayers.length, href: "/admin?section=players" },
    { label: "Events", value: allEvents.length, href: "/admin?section=onice" },
    { label: "Competitions", value: competitions.length, href: "/admin?section=dvhl" },
    { label: "Check-ins", value: store.checkIns.length, href: "/admin?section=attendance" }
  ] as const;
  const onIceEvents = allEvents.filter((event) => isOnIceEventType(event.eventTypeName));
  const offIceEvents = allEvents.filter((event) => isOffIceEventType(event.eventTypeName));
  const scopedEvents = section === "onice" ? onIceEvents : section === "office" ? offIceEvents : allEvents;
  const showcaseByGallery = showcasePhotos.reduce((acc, photo) => {
    const key = photo.gallery || "general";
    const list = acc.get(key) || [];
    list.push(photo);
    acc.set(key, list);
    return acc;
  }, new Map<string, Array<(typeof showcasePhotos)[number]>>());
  const announcementDeliveryCounts = new Map<string, { sent: number; failed: number; queued: number }>();
  const announcementViewsById = new Map<string, string[]>();
  for (const item of announcements) {
    const deliveries = await listAnnouncementDeliveriesByAnnouncement(item.id);
    const views = await listAnnouncementViewsByAnnouncement(item.id);
    announcementDeliveryCounts.set(item.id, {
      sent: deliveries.filter((entry) => entry.status === "sent").length,
      failed: deliveries.filter((entry) => entry.status === "failed").length,
      queued: deliveries.filter((entry) => entry.status === "queued").length
    });
    announcementViewsById.set(
      item.id,
      views.map((entry) => entry.userId)
    );
  }

  return (
    <section className="stack admin-shell">
      <article className="card hero-card admin-hero">
        <p className="eyebrow">Warrior HQ</p>
        <h2>Hockey Ops Dashboard</h2>
        <p>
          Signed in as <strong>{user.email}</strong> | Storage mode:{" "}
          <strong>{hasDatabaseUrl() ? "Database" : "Fallback file"}</strong>
        </p>
        <div className="admin-kpi-grid">
          {snapshotItems.map((item) => (
            <Link key={item.label} href={item.href} className="admin-kpi admin-kpi-link">
              <span className="muted">{item.label}</span>
              <strong>{item.value}</strong>
              <span className="admin-kpi-cta">Open</span>
            </Link>
          ))}
        </div>
        {statusMessages.map((message) => (
          <p className="badge" key={message}>{message}</p>
        ))}
        {query.error && (
          <p className="muted">
            {query.error === "link_failed"
              ? query.errorDetail
                ? decodeURIComponent(query.errorDetail)
                : "Unable to link this contact by email."
              : query.error === "invite_send_failed"
              ? query.errorDetail
                ? decodeURIComponent(query.errorDetail)
                : "Unable to send invite email."
              : query.error === "role_update_failed"
              ? query.errorDetail
                ? decodeURIComponent(query.errorDetail)
                : "Unable to update user role."
              : query.errorDetail
              ? decodeURIComponent(query.errorDetail)
              : query.error.replaceAll("_", " ")}
          </p>
        )}
      </article>
      <div className="admin-panel-layout">
        <aside className="card admin-side-nav-card">
          <h3>Hockey Ops</h3>
          <nav className="admin-side-nav" aria-label="Admin sections">
            {visibleSectionDefs.map((entry) => (
              <Link
                key={entry.key}
                href={`/admin?section=${entry.key}`}
                className={`admin-side-link ${section === entry.key ? "active" : ""}`}
              >
                {entry.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="stack admin-panel-content">
      {section === "overview" && (
        <>
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
          <article className="card">
            <h3>Operations Playbook</h3>
            <p className="muted">Recommended daily workflow for any Hockey Ops admin.</p>
            <ol>
              <li><Link href="/admin?section=contacts">Users & Applications: review player applications and manage supporter accounts.</Link></li>
              <li><Link href="/admin?section=onice">On-Ice Events: manage tournaments, games, scrimmages, and practices.</Link></li>
              <li><Link href="/admin?section=office">Off-Ice Events: manage family events, parties, and volunteer opportunities.</Link></li>
              <li><Link href="/admin/dvhl">DVHL: manage seasons, teams, schedule, and sub pools.</Link></li>
              <li><Link href="/admin?section=players">Roster & Roles: finalize team assignments and player approvals.</Link></li>
              <li><Link href="/admin?section=usermanagement">User Management: non-player accounts and Ops roles.</Link></li>
              <li><Link href="/admin?section=news">News: publish updates for homepage and supporter visibility.</Link></li>
            </ol>
          </article>
        </>
      )}

      {section === "dvhl" && (
        <article className="card">
          <h3>DVHL Hub</h3>
          <p className="muted">
            DVHL operations now live in a dedicated module with its own sidebar and workflow.
          </p>
          <ul>
            <li>Dashboard with season status and standings</li>
            <li>Create seasons, add teams, assign captains and players</li>
            <li>Team roster pages, schedule builder, scorekeeper assignment</li>
            <li>Sub pool management for captain and volunteer workflows</li>
          </ul>
          <p>
            <Link className="button" href="/admin/dvhl">
              Open DVHL Hub
            </Link>
          </p>
        </article>
      )}

      {section === "sportsdata" && (
        <div className="admin-grid-2">
          <article className="card admin-card-compact">
            <h3>Create Season</h3>
            <form className="grid-form" action="/api/admin/data/season" method="post">
              <input name="label" placeholder="2026-2027" required />
              <label>
                Season start
                <input name="startsAt" type="date" />
              </label>
              <label>
                Season end
                <input name="endsAt" type="date" />
              </label>
              <label><input name="isActive" type="checkbox" /> Mark as active season</label>
              <label><input name="isArchived" type="checkbox" /> Archive immediately</label>
              <button className="button" type="submit">Create Season</button>
            </form>
          </article>

          <article className="card admin-card-compact">
            <h3>Create Team</h3>
            <form className="grid-form" action="/api/admin/data/team" method="post">
              <input name="name" placeholder="Warriors Gold" required />
              <input name="code" placeholder="WGOLD (optional)" />
              <input name="colorTag" placeholder="gold / white / black" />
              <input name="level" placeholder="Tournament / DVHL / Exhibition" />
              <label>
                Season
                <select name="seasonId" defaultValue="">
                  <option value="">No season</option>
                  {sportsData.seasons.map((season) => (
                    <option key={season.id} value={season.id}>{season.label}</option>
                  ))}
                </select>
              </label>
              <label><input name="isActive" type="checkbox" defaultChecked /> Team is active</label>
              <button className="button" type="submit">Create Team</button>
            </form>
          </article>

          <article className="card admin-card-compact">
            <h3>Create Venue</h3>
            <form className="grid-form" action="/api/admin/data/venue" method="post">
              <input name="name" placeholder="Pittsburgh Ice Arena" required />
              <input name="address1" placeholder="Address" />
              <input name="city" placeholder="City" />
              <input name="state" placeholder="State" />
              <input name="postalCode" placeholder="Postal code" />
              <input name="mapUrl" placeholder="Google Maps share URL" />
              <button className="button" type="submit">Create Venue</button>
            </form>
          </article>

          <article className="card admin-card-compact">
            <h3>Create Position</h3>
            <form className="grid-form" action="/api/admin/data/position" method="post">
              <input name="code" placeholder="F / D / G / C / LW / RW" required />
              <input name="label" placeholder="Forward / Defense / Goalie" required />
              <button className="button" type="submit">Create Position</button>
            </form>
          </article>

          <article className="card admin-card-compact">
            <h3>Create Staff Profile</h3>
            <form className="grid-form" action="/api/admin/data/staff" method="post">
              <input name="fullName" placeholder="Staff name" required />
              <input name="jobTitle" placeholder="Head Coach / GM / Equipment Manager" required />
              <input name="email" placeholder="Email" />
              <input name="phone" placeholder="Phone" />
              <input name="bio" placeholder="Bio or notes" />
              <label><input name="isActive" type="checkbox" defaultChecked /> Active staff</label>
              <button className="button" type="submit">Create Staff Profile</button>
            </form>
          </article>

          <article className="card admin-card-compact">
            <h3>Create Sponsor</h3>
            <form className="grid-form" action="/api/admin/data/sponsor" method="post">
              <input name="name" placeholder="Sponsor name" required />
              <input name="websiteUrl" placeholder="https://sponsor.com" />
              <input name="logoUrl" placeholder="https://.../logo.png" />
              <input name="notes" placeholder="Display notes" />
              <label><input name="isActive" type="checkbox" defaultChecked /> Active sponsor</label>
              <button className="button" type="submit">Create Sponsor</button>
            </form>
          </article>

          <article className="card admin-grid-span">
            <h3>Sports Data Directory</h3>
            <div className="stack">
              <div className="event-card">
                <strong>Seasons ({sportsData.seasons.length})</strong>
                <p>
                  {sportsData.seasons.length > 0
                    ? sportsData.seasons.map((season) => `${season.label}${season.isActive ? " (active)" : ""}`).join(", ")
                    : "None yet"}
                </p>
              </div>
              <div className="event-card">
                <strong>Teams ({sportsData.teams.length})</strong>
                <p>
                  {sportsData.teams.length > 0
                    ? sportsData.teams.map((team) => `${team.name}${team.season ? ` - ${team.season.label}` : ""}`).join(", ")
                    : "None yet"}
                </p>
              </div>
              <div className="event-card">
                <strong>Venues ({sportsData.venues.length})</strong>
                <p>
                  {sportsData.venues.length > 0
                    ? sportsData.venues.map((venue) => venue.name).join(", ")
                    : "None yet"}
                </p>
              </div>
              <div className="event-card">
                <strong>Positions ({sportsData.positions.length})</strong>
                <p>
                  {sportsData.positions.length > 0
                    ? sportsData.positions.map((position) => `${position.code}: ${position.label}`).join(", ")
                    : "None yet"}
                </p>
              </div>
              <div className="event-card">
                <strong>Staff ({sportsData.staff.length})</strong>
                <p>
                  {sportsData.staff.length > 0
                    ? sportsData.staff.map((staff) => `${staff.fullName} (${staff.jobTitle})`).join(", ")
                    : "None yet"}
                </p>
              </div>
              <div className="event-card">
                <strong>Sponsors ({sportsData.sponsors.length})</strong>
                <p>
                  {sportsData.sponsors.length > 0
                    ? sportsData.sponsors.map((sponsor) => `${sponsor.name} (${sponsor.impressions} views, ${sponsor.clicks} clicks)`).join(", ")
                    : "None yet"}
                </p>
              </div>
              <div className="event-card">
                <strong>Website Users ({store.users.length})</strong>
                <p>
                  {store.users.length > 0
                    ? store.users
                        .slice(0, 12)
                        .map((member) => `${member.fullName} (${member.role})`)
                        .join(", ")
                    : "No users yet"}
                </p>
              </div>
            </div>
          </article>
        </div>
      )}

      {section === "competitions" && (
        <div className="stack">
          <details className="card admin-disclosure" open>
            <summary>Create Tournament</summary>
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
          </details>

          <details className="card admin-disclosure">
            <summary>Create Single Game</summary>
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
          </details>

          <details className="card admin-disclosure">
            <summary>Create DVHL League</summary>
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
          </details>

          <details className="card admin-disclosure" open>
            <summary>Competition Team Builder</summary>
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
                          {competition.type === "DVHL" ? (
                            <div className="stack">
                              <form className="grid-form" action="/api/admin/competitions/dvhl-captain" method="post">
                                <input type="hidden" name="teamId" value={team.id} />
                                <label>
                                  Team captain
                                  <select
                                    name="captainUserId"
                                    defaultValue={dvhlTeamControlByTeamId[team.id]?.captainUserId || ""}
                                  >
                                    <option value="">No captain selected</option>
                                    {team.members.map((member) => (
                                      <option key={member.user.id} value={member.user.id}>
                                        {member.user.fullName}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <button className="button ghost" type="submit">Save Captain</button>
                              </form>
                              <form className="grid-form" action="/api/admin/competitions/dvhl-sub-pool" method="post">
                                <input type="hidden" name="teamId" value={team.id} />
                                <input type="hidden" name="action" value="add" />
                                <label>
                                  Add player to sub pool
                                  <select name="userId" defaultValue="">
                                    <option value="" disabled>Select eligible player</option>
                                    {eligiblePlayers.map((player) => (
                                      <option key={player.id} value={player.id}>
                                        {player.fullName}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <button className="button ghost" type="submit">Add Sub</button>
                              </form>
                              <div className="event-card">
                                <strong>Sub pool</strong>
                                {(dvhlTeamControlByTeamId[team.id]?.subPoolUserIds || []).length === 0 ? (
                                  <p className="muted">No subs assigned.</p>
                                ) : (
                                  <div className="stack">
                                    {dvhlTeamControlByTeamId[team.id].subPoolUserIds.map((subUserId) => {
                                      const sub = eligiblePlayers.find((entry) => entry.id === subUserId);
                                      return (
                                        <form key={`${team.id}-${subUserId}`} className="cta-row" action="/api/admin/competitions/dvhl-sub-pool" method="post">
                                          <input type="hidden" name="teamId" value={team.id} />
                                          <input type="hidden" name="userId" value={subUserId} />
                                          <input type="hidden" name="action" value="remove" />
                                          <span>{sub?.fullName || subUserId}</span>
                                          <button className="button alt" type="submit">Remove</button>
                                        </form>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : null}

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
                            <label>
                              Scorekeeper assignment
                              <select name="scorekeeperType" defaultValue="none">
                                <option value="none">None</option>
                                <option value="player">Player/Admin account</option>
                                <option value="staff">Staff profile</option>
                              </select>
                            </label>
                            <label>
                              Scorekeeper user account
                              <select name="scorekeeperUserId" defaultValue="">
                                <option value="">No user assignment</option>
                                {eligibleScorekeepers.map((entry) => (
                                  <option key={entry.id} value={entry.id}>
                                    {entry.fullName} ({entry.role})
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Scorekeeper staff
                              <select name="scorekeeperStaffId" defaultValue="">
                                <option value="">No staff assignment</option>
                                {sportsData.staff.map((staff) => (
                                  <option key={staff.id} value={staff.id}>
                                    {staff.fullName} ({staff.jobTitle})
                                  </option>
                                ))}
                              </select>
                            </label>
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
                                  <p>Status: {game.liveStatus || game.status} | Score: {game.warriorsScore} - {game.opponentScore} | {game.period}{game.clock ? ` ${game.clock}` : ""}</p>
                                  <p>
                                    Scorekeeper: {game.scorekeeperUser?.fullName || game.scorekeeperStaff?.fullName || "Unassigned"}
                                  </p>
                                  <form className="grid-form" action="/api/admin/competitions/assign-scorekeeper" method="post">
                                    <input type="hidden" name="gameId" value={game.id} />
                                    <label>
                                      Assignment type
                                      <select name="scorekeeperType" defaultValue={game.scorekeeperUser ? "player" : game.scorekeeperStaff ? "staff" : "none"}>
                                        <option value="none">None</option>
                                        <option value="player">Player/Admin account</option>
                                        <option value="staff">Staff profile</option>
                                      </select>
                                    </label>
                                    <label>
                                      User account
                                      <select name="scorekeeperUserId" defaultValue={game.scorekeeperUser?.id || ""}>
                                        <option value="">No user assignment</option>
                                        {eligibleScorekeepers.map((entry) => (
                                          <option key={entry.id} value={entry.id}>{entry.fullName} ({entry.role})</option>
                                        ))}
                                      </select>
                                    </label>
                                    <label>
                                      Staff
                                      <select name="scorekeeperStaffId" defaultValue={game.scorekeeperStaff?.id || ""}>
                                        <option value="">No staff assignment</option>
                                        {sportsData.staff.map((staff) => (
                                          <option key={staff.id} value={staff.id}>{staff.fullName} ({staff.jobTitle})</option>
                                        ))}
                                      </select>
                                    </label>
                                    <button className="button ghost" type="submit">Update Scorekeeper</button>
                                  </form>
                                  <p>
                                    <Link href="/games">Open live scorekeeping console</Link>
                                  </p>
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
          </details>
        </div>
      )}

      {section === "contacts" && (
        <div className="stack">
          <article className="card">
            <h3>Users And Player Applications</h3>
            <p className="muted">
              Legacy contact import tools have been retired. This area now manages real website users, player
              applications, and onboarding.
            </p>
            <p className="muted">
              Invite email copy is now standardized. Use <strong>Preview Invite Email</strong> on any user to verify the exact
              outgoing message before sending.
            </p>
            <div className="admin-kpi-grid">
              <div className="admin-kpi">
                <span className="muted">Total users</span>
                <strong>{store.users.length}</strong>
              </div>
              <div className="admin-kpi">
                <span className="muted">Supporters</span>
                <strong>{store.users.filter((entry) => entry.role === "public" && entry.status === "approved").length}</strong>
              </div>
              <div className="admin-kpi">
                <span className="muted">Pending player apps</span>
                <strong>{pendingUsers.length}</strong>
              </div>
              <div className="admin-kpi">
                <span className="muted">Approved players</span>
                <strong>{approvedPlayers.length}</strong>
              </div>
            </div>
            <p className="muted">
              Public signup URL: <code>https://pghwarriorhockey.us/join</code>
            </p>
          </article>

          <article className="card">
            <h3>Pending Player Applications</h3>
            <details className="event-card admin-disclosure" open>
              <summary>Onboarding Checklist Template</summary>
              <p className="muted">
                One checklist item per line. This template is used for all player onboarding tracking.
              </p>
              <form className="grid-form" action="/api/admin/onboarding/template" method="post">
                <textarea
                  name="template"
                  rows={8}
                  defaultValue={onboardingTemplate.map((item) => item.label).join("\n")}
                />
                <button className="button" type="submit">Save Onboarding Template</button>
              </form>
            </details>
            {pendingUsers.length === 0 ? (
              <p className="muted">No pending player applications.</p>
            ) : (
              <div className="stack">
                {pendingUsers.map((candidate) => {
                  const extra = profileExtraByUserId.get(candidate.id);
                  return (
                    <div key={candidate.id} className="event-card stack">
                      <strong>{candidate.fullName}</strong>
                      <p>{candidate.email}</p>
                      <p>Phone: {candidate.phone || "Not provided"}</p>
                      <p>Preferred position: {candidate.requestedPosition || "Not provided"}</p>
                      <p>Experience: {extra?.playerExperienceSummary || "Not provided"}</p>
                      <p>
                        USA Hockey #: {extra?.usaHockeyNumber || "Missing"} | Status: {extra?.usaHockeyStatus || "unverified"}
                      </p>
                      <p>
                        Needs equipment: {extra?.needsEquipment ? "Yes" : "No"} | Code of conduct accepted:{" "}
                        {extra?.codeOfConductAcceptedAt ? new Date(extra.codeOfConductAcceptedAt).toLocaleString() : "No"}
                      </p>
                      <form
                        className="grid-form"
                        action={`/api/admin/users/${candidate.id}/approve`}
                        method="post"
                      >
                        <label>
                          Main roster
                          <select name="rosterId" defaultValue="main-player-roster">
                            <option value="main-player-roster">Main Player Roster</option>
                          </select>
                        </label>
                        <label>
                          Primary sub-roster
                          <select name="primarySubRoster" defaultValue="" required>
                            <option value="" disabled>Select color roster</option>
                            <option value="gold">Gold</option>
                            <option value="white">White</option>
                            <option value="black">Black</option>
                          </select>
                        </label>
                        <label>
                          Jersey number (optional)
                          <input name="jerseyNumber" type="number" min="1" max="99" />
                        </label>
                        <label>
                          <input type="checkbox" name="allowCrossColorJerseyOverlap" /> Allow cross-color overlap
                        </label>
                        <button className="button" type="submit">Approve Player Application</button>
                      </form>
                      <form action={`/api/admin/users/${candidate.id}/reject`} method="post">
                        <button className="button alt" type="submit">Reject Application</button>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className="card">
            <h3>Existing Website Users</h3>
            {nonPlayerUsers.length === 0 ? (
              <p className="muted">No non-player website users.</p>
            ) : (
              <div className="stack">
                {nonPlayerUsers.map((member) => (
                  <div key={member.id} className="event-card stack">
                    <strong>{member.fullName}</strong>
                    <p>{member.email}</p>
                    <p>
                      Role: {member.role} | Status: {member.status}
                    </p>
                    <p>
                      <a
                        className="button alt"
                        href={`/api/admin/users/${member.id}/invite-preview`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Preview Invite Email
                      </a>
                    </p>
                    <form className="grid-form" action={`/api/admin/users/${member.id}/access`} method="post">
                      <input type="hidden" name="returnTo" value="/admin?section=contacts" />
                      <label>
                        Set role
                        <select name="role" defaultValue={member.role}>
                          <option value="public">Public</option>
                          <option value="player">Player</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>
                      <button className="button ghost" type="submit">Save User Access</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      )}

      {section === "announcements" && (
        <div className="stack">
          <article className="card">
            <h3>Create Announcement</h3>
            <p className="muted">
              Announcements appear at the top of Player HQ and can also send email/SMS/push by each player's notification preferences.
            </p>
            <form className="grid-form" action="/api/admin/announcements/create" method="post">
              <input type="hidden" name="returnTo" value="/admin?section=announcements" />
              <input name="title" placeholder="Announcement title" required />
              <textarea name="body" rows={6} placeholder="Announcement details" required />
              <label>
                Category
                <select name="category" defaultValue="general">
                  <option value="general">General</option>
                  <option value="events">Events</option>
                  <option value="dvhl">DVHL</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label>
                Audience
                <select name="audience" defaultValue="players">
                  <option value="players">Players</option>
                  <option value="all_users">All approved users</option>
                </select>
              </label>
              <label>
                Expires at (optional)
                <input name="expiresAt" type="datetime-local" />
              </label>
              <label>
                <input name="pinned" type="checkbox" /> Pin to top
              </label>
              <label>
                <input name="sendNow" type="checkbox" defaultChecked /> Send now using user notification preferences
              </label>
              <button className="button" type="submit">Create Announcement</button>
            </form>
          </article>

          <article className="card">
            <h3>Manage Announcements</h3>
            <div className="stack">
              {announcements.length === 0 ? (
                <p className="muted">No announcements created yet.</p>
              ) : (
                announcements.map((announcement) => {
                  const delivery = announcementDeliveryCounts.get(announcement.id) || {
                    sent: 0,
                    failed: 0,
                    queued: 0
                  };
                  const viewedUserIds = new Set(announcementViewsById.get(announcement.id) || []);
                  const recipients = store.users.filter((entry) =>
                    announcement.audience === "all_users"
                      ? entry.status === "approved"
                      : entry.role === "player" && entry.status === "approved"
                  );
                  const viewedCount = recipients.filter((entry) => viewedUserIds.has(entry.id)).length;
                  const notViewed = recipients.filter((entry) => !viewedUserIds.has(entry.id));
                  return (
                    <details key={announcement.id} className="event-card admin-disclosure" open={announcement.pinned}>
                      <summary>
                        {announcement.title} | {announcement.category.toUpperCase()} | {announcement.isActive ? "Active" : "Inactive"}
                      </summary>
                      <form className="grid-form" action="/api/admin/announcements/update" method="post">
                        <input type="hidden" name="announcementId" value={announcement.id} />
                        <input type="hidden" name="returnTo" value="/admin?section=announcements" />
                        <input name="title" defaultValue={announcement.title} required />
                        <textarea name="body" rows={6} defaultValue={announcement.body} required />
                        <label>
                          Category
                          <select name="category" defaultValue={announcement.category}>
                            <option value="general">General</option>
                            <option value="events">Events</option>
                            <option value="dvhl">DVHL</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </label>
                        <label>
                          Audience
                          <select name="audience" defaultValue={announcement.audience}>
                            <option value="players">Players</option>
                            <option value="all_users">All approved users</option>
                          </select>
                        </label>
                        <label>
                          Expires at (optional)
                          <input
                            name="expiresAt"
                            type="datetime-local"
                            defaultValue={announcement.expiresAt ? announcement.expiresAt.slice(0, 16) : ""}
                          />
                        </label>
                        <label>
                          <input name="isActive" type="checkbox" defaultChecked={announcement.isActive} /> Active
                        </label>
                        <label>
                          <input name="pinned" type="checkbox" defaultChecked={announcement.pinned} /> Pinned
                        </label>
                        <p className="muted">
                          Deliveries: sent {delivery.sent} | queued {delivery.queued} | failed {delivery.failed}
                        </p>
                        <p className="muted">
                          Opened in HQ: {viewedCount}/{recipients.length}
                        </p>
                        {notViewed.length > 0 ? (
                          <details className="event-card admin-disclosure">
                            <summary>Not opened yet ({notViewed.length})</summary>
                            <ul>
                              {notViewed.slice(0, 50).map((member) => (
                                <li key={member.id}>
                                  {member.fullName} ({member.email})
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                        <div className="cta-row">
                          <button className="button ghost" type="submit">Save Changes</button>
                          <button className="button" type="submit" formAction="/api/admin/announcements/send">
                            Send Again
                          </button>
                          <button
                            className="button alt"
                            type="submit"
                            formAction="/api/admin/announcements/delete"
                            name="announcementId"
                            value={announcement.id}
                          >
                            Delete
                          </button>
                        </div>
                      </form>
                    </details>
                  );
                })
              )}
            </div>
          </article>
        </div>
      )}

      {section === "news" && (
        <div className="stack">
          <article className="card">
            <h3>Create News Post</h3>
            <form className="grid-form" action="/api/admin/news/create" method="post">
              <input name="title" placeholder="Headline" required />
              <input name="slug" placeholder="Custom slug (optional)" />
              <input name="summary" placeholder="Short summary" required />
              <textarea name="body" rows={8} placeholder="Full story body" required />
              <input name="coverImageUrl" placeholder="Cover image URL (optional)" />
              <input name="videoUrl" placeholder="Video URL (optional)" />
              <input name="galleryImageUrls" placeholder="Gallery image URLs (comma-separated)" />
              <input name="tags" placeholder="Tags (comma-separated)" />
              <label>
                <input name="homeFeature" type="checkbox" /> Prioritize on homepage
              </label>
              <label>
                <input name="published" type="checkbox" defaultChecked /> Publish immediately
              </label>
              <button className="button" type="submit">Create Post</button>
            </form>
            <p className="muted">
              Tip: use the <Link href="/admin?section=media">Media tab</Link> to host photos locally, then paste those local URLs here.
            </p>
          </article>

          <article className="card">
            <h3>Manage News Posts</h3>
            <div className="stack">
              {newsPosts.map((post) => (
                <form key={post.id} className="event-card grid-form" action="/api/admin/news/update" method="post">
                  <input type="hidden" name="postId" value={post.id} />
                  <input name="title" defaultValue={post.title} required />
                  <input name="slug" defaultValue={post.slug} />
                  <input name="summary" defaultValue={post.summary} required />
                  <textarea name="body" rows={6} defaultValue={post.body} required />
                  <input name="coverImageUrl" defaultValue={post.coverImageUrl || ""} />
                  <input name="videoUrl" defaultValue={post.videoUrl || ""} />
                  <input name="galleryImageUrls" defaultValue={post.galleryImageUrls.join(",")} />
                  <input name="tags" defaultValue={post.tags.join(",")} />
                  <label>
                    <input
                      name="homeFeature"
                      type="checkbox"
                      defaultChecked={post.tags.includes("home_feature")}
                    />{" "}
                    Prioritize on homepage
                  </label>
                  <label>
                    <input name="published" type="checkbox" defaultChecked={post.published} /> Published
                  </label>
                  <div className="cta-row">
                    <button className="button ghost" type="submit">Save Post</button>
                    <button className="button alt" type="submit" formAction="/api/admin/news/delete" name="postId" value={post.id}>
                      Delete
                    </button>
                  </div>
                </form>
              ))}
              {newsPosts.length === 0 ? <p className="muted">No news posts yet.</p> : null}
            </div>
          </article>
        </div>
      )}

      {section === "media" && (
        <div className="stack">
          <article className="card">
            <h3>Homepage Showcase Media</h3>
            <p className="muted">
              Upload one or many photos into galleries. These assets are reused across homepage, events, and news.
            </p>
            <form
              className="grid-form"
              action="/api/admin/media/showcase/upload"
              method="post"
              encType="multipart/form-data"
            >
              <label>
                Gallery name
                <input
                  name="galleryName"
                  placeholder="general, veterans-day-2026, dvhl-playoffs"
                  defaultValue="general"
                />
              </label>
              <label>
                Select photos
                <input name="photoFiles" type="file" accept="image/*" multiple required />
              </label>
              <button className="button" type="submit">Upload To Gallery</button>
            </form>
            <p className="muted">
              Existing galleries: {showcaseGalleries.length > 0 ? showcaseGalleries.join(", ") : "none yet"}
            </p>
          </article>
          <article className="card">
            <h3>Current Showcase Library</h3>
            {showcasePhotos.length === 0 ? (
              <p className="muted">No local showcase photos yet. Upload at least one image.</p>
            ) : (
              <div className="stack">
                {Array.from(showcaseByGallery.entries()).map(([gallery, photos]) => (
                  <section key={gallery} className="event-card stack">
                    <div className="event-top">
                      <strong>Gallery: {gallery}</strong>
                      <span className="user-pill">{photos.length} items</span>
                    </div>
                    <div className="about-card-grid">
                      {photos.map((photo) => (
                        <article key={photo.id} className="event-card stack">
                          <img src={photo.imageUrl} alt={photo.fileName} style={{ width: "100%", borderRadius: "10px" }} />
                          <p className="muted">{photo.fileName}</p>
                          <div className="cta-row">
                            <a className="button ghost" href={photo.viewUrl} target="_blank" rel="noreferrer">
                              Open
                            </a>
                            <form action="/api/admin/media/showcase/delete" method="post">
                              <input type="hidden" name="imagePath" value={photo.imageUrl} />
                              <button className="button alt" type="submit">Delete</button>
                            </form>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </article>
        </div>
      )}

      {(section === "onice" || section === "office") && (
        <div className="stack">
          {(() => {
            const eventScope = section === "onice" ? "onice" : "office";
            const returnSection = section;
            return (
          <>
          <article className="card">
            <h3>{eventScope === "onice" ? "Quick On-Ice Event Builder" : "Quick Off-Ice Event Builder"}</h3>
            <p className="muted">
              Use this for all non-DVHL events in this category. DVHL events and schedule are managed in the dedicated DVHL hub.
            </p>
            <p>
              <Link className="button ghost" href="/admin/dvhl">
                Open DVHL Hub
              </Link>
            </p>
            <form className="grid-form" action="/api/admin/events/quick" method="post">
              <input type="hidden" name="returnTo" value={`/admin?section=${returnSection}`} />
              <input name="title" placeholder="Event title" required />
              <label>
                Date/time
                <input name="startsAt" type="datetime-local" required />
              </label>
              <input name="locationPublic" placeholder="Location (optional)" />
              <label>
                Event template
                <select name="eventKind" defaultValue={eventScope === "onice" ? "hockey_interest" : "off_ice"}>
                  {eventScope === "onice" ? (
                    <>
                      <option value="hockey_interest">Tournament / Game (Interest Gathering)</option>
                      <option value="hockey_rsvp">Practice / Scrimmage (Straight RSVP)</option>
                    </>
                  ) : (
                    <>
                      <option value="off_ice">Family / Community Event (Straight RSVP)</option>
                      <option value="volunteer">Volunteer Opportunity (Straight RSVP)</option>
                    </>
                  )}
                </select>
              </label>
              <button className="button" type="submit">Create Quick Event</button>
            </form>
          </article>

          <details className="card admin-disclosure" open>
            <summary>Guided Event Wizard</summary>
            <p className="muted">
              Step-by-step flow for non-technical admins: basics, signup type, then publish.
            </p>
            <form className="grid-form" action="/api/admin/events/quick" method="post">
              <input type="hidden" name="returnTo" value={`/admin?section=${returnSection}`} />
              <h4>Step 1: Basics</h4>
              <input name="title" placeholder="Event title" required />
              <label>
                Event date/time
                <input name="startsAt" type="datetime-local" required />
              </label>
              <input name="locationPublic" placeholder="Public location" />

              <h4>Step 2: Event Type</h4>
              <label>
                Event template
                <select name="eventKind" defaultValue={eventScope === "onice" ? "hockey_interest" : "off_ice"}>
                  {eventScope === "onice" ? (
                    <>
                      <option value="hockey_interest">On-Ice Interest Gathering</option>
                      <option value="hockey_rsvp">On-Ice Straight RSVP</option>
                    </>
                  ) : (
                    <>
                      <option value="off_ice">Off-Ice Straight RSVP</option>
                      <option value="volunteer">Volunteer Opportunity</option>
                    </>
                  )}
                </select>
              </label>

              <h4>Step 3: Publish</h4>
              <button className="button" type="submit">Create Event</button>
            </form>
          </details>

          <details className="card admin-disclosure">
            <summary>Event Types</summary>
            <p className="muted">
              Add event categories that can be reused in scheduling and reporting.
            </p>
            <form className="grid-form" action="/api/admin/events/type" method="post">
              <input name="name" placeholder="Practice / Scrimmage / Volunteer / Off-Ice / Custom" required />
              <button className="button" type="submit">Create Event Type</button>
            </form>
            <p className="muted">
              Current types: {eventTypes.length > 0 ? eventTypes.map((entry) => entry.name).join(", ") : "None yet"}
            </p>
          </details>

          <details className="card admin-disclosure" open>
            <summary>Create Event</summary>
            <h3>Publish Event (Public Site Feed Source)</h3>
            <form className="grid-form" action="/api/admin/events" method="post">
              <input type="hidden" name="returnTo" value={`/admin?section=${returnSection}`} />
              <h4>Step 1: Core Details</h4>
              <input name="title" placeholder="Event title" required />
              <label>
                Start date/time
                <input name="startsAt" type="datetime-local" required />
              </label>
              <label>
                Event category preset
                <select name="eventTypePreset" defaultValue="">
                  <option value="">No preset</option>
                  <option value="Practice">Practice</option>
                  <option value="Scrimmage">Scrimmage</option>
                  <option value="Game">Game</option>
                  <option value="Tournament">Tournament</option>
                  <option value="Volunteer">Volunteer</option>
                  <option value="Off-Ice">Off-Ice</option>
                </select>
              </label>
              <label>
                Event type override
                <select name="eventTypeId" defaultValue="">
                  <option value="">Use preset/default</option>
                  {eventTypes.map((eventType) => (
                    <option key={eventType.id} value={eventType.id}>{eventType.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Signup flow
                <select name="signupMode" defaultValue="straight_rsvp">
                  <option value="straight_rsvp">Straight RSVP (unlimited)</option>
                  <option value="interest_gathering">Interest gathering (roster selected by Hockey Ops)</option>
                </select>
              </label>
              <input name="locationPublic" placeholder="Public location" />
              <label>
                Public details
                <input name="publicDetails" placeholder="Public summary" required />
              </label>
              <label>
                <input name="published" type="checkbox" defaultChecked /> Publish to public feed
              </label>

              <details className="event-card admin-disclosure">
                <summary>Step 2: Team + Visibility (advanced)</summary>
                <input name="locationPrivate" placeholder="Private location (players/admin)" />
                <label>
                  Game manager
                  <select name="managerUserId" defaultValue="">
                    <option value="">No manager assigned</option>
                    {approvedPlayers.map((member) => (
                      <option key={member.id} value={member.id}>{member.fullName}</option>
                    ))}
                  </select>
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
                  <input name="requiresUsaHockeyVerified" type="checkbox" /> Require verified USA Hockey number
                </label>
              </details>

              <details className="event-card admin-disclosure">
                <summary>Step 3: Interest + Guest Rules (optional)</summary>
                <label>
                  Interest closes at
                  <input name="interestClosesAt" type="datetime-local" />
                </label>
                <label>
                  Target roster size
                  <input name="targetRosterSize" type="number" min={1} step={1} placeholder="Optional" />
                </label>
                <label>
                  <input name="allowGuestRequests" type="checkbox" /> Allow players to request guests (disabled for DVHL)
                </label>
                <label>
                  <input name="guestCostEnabled" type="checkbox" /> Guest cost applies
                </label>
                <input name="guestCostLabel" placeholder="Guest cost label (e.g., hotel fee)" />
                <input name="guestCostAmountUsd" type="number" min={0} step="0.01" placeholder="Guest cost amount (USD)" />
              </details>

              <details className="event-card admin-disclosure">
                <summary>Step 4: Maps + Images (optional)</summary>
                <p className="muted">
                  Map links auto-generate from entered addresses. Only fill these when you need an override.
                </p>
                <input name="locationPublicMapUrl" placeholder="Public maps URL override (optional)" />
                <input name="locationPrivateMapUrl" placeholder="Private maps URL override (optional)" />
                <label>
                  Hero image from media library
                  <select name="heroImageChoice" defaultValue="">
                    <option value="">None selected</option>
                    {showcasePhotos.map((photo) => (
                      <option key={`hero-${photo.id}`} value={photo.imageUrl}>
                        [{photo.gallery}] {photo.fileName}
                      </option>
                    ))}
                  </select>
                </label>
                <input name="heroImageUrl" placeholder="Hero image URL (optional override)" />
                <label>
                  Thumbnail from media library
                  <select name="thumbnailImageChoice" defaultValue="">
                    <option value="">None selected</option>
                    {showcasePhotos.map((photo) => (
                      <option key={`thumb-${photo.id}`} value={photo.imageUrl}>
                        [{photo.gallery}] {photo.fileName}
                      </option>
                    ))}
                  </select>
                </label>
                <input name="thumbnailImageUrl" placeholder="Thumbnail URL (optional override)" />
              </details>
              <button className="button" type="submit">Save Event</button>
            </form>
          </details>

          <details className="card admin-disclosure" open>
            <summary>Event Manager</summary>
            <h3>Current Event Feed Inventory</h3>
            <div className="stack">
              {scopedEvents.map((event) => (
                <details key={event.id} className="event-card admin-disclosure">
                  <summary>{event.title} | {new Date(event.date).toLocaleString()}</summary>
                  {(() => {
                    const signupConfig = signupConfigsByEvent[event.id];
                    const rosterSelection = rosterSelectionsByEvent[event.id];
                    const selectedCount = rosterSelection?.selectedUserIds.length || 0;
                    return (
                      <p>
                        Type: {event.eventTypeName || "Uncategorized"} | Manager: {event.managerName || "Unassigned"} | Flow:{" "}
                        {signupConfig?.signupMode === "interest_gathering" ? "Interest Gathering" : "Straight RSVP"}
                        {signupConfig?.signupMode === "interest_gathering" && signupConfig.interestClosesAt
                          ? ` | Closes: ${new Date(signupConfig.interestClosesAt).toLocaleString()}`
                          : ""}
                        {signupConfig?.signupMode === "interest_gathering" && signupConfig.targetRosterSize
                          ? ` | Target: ${signupConfig.targetRosterSize}`
                          : ""}
                        {signupConfig?.signupMode === "interest_gathering" ? ` | Selected: ${selectedCount}` : ""}
                        {signupConfig?.requiresUsaHockeyVerified ? " | USA Hockey verified required" : ""}
                      </p>
                    );
                  })()}
                  <form className="grid-form" action="/api/admin/events/update" method="post">
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="returnTo" value={`/admin?section=${returnSection}`} />
                    <h4>Step 1: Core Details</h4>
                    <input name="title" defaultValue={event.title} required />
                    <label>
                      Start date/time
                      <input
                        name="startsAt"
                        type="datetime-local"
                        defaultValue={new Date(event.date).toISOString().slice(0, 16)}
                        required
                      />
                    </label>
                    <label>
                      Event category preset
                      <select name="eventTypePreset" defaultValue="">
                        <option value="">No change</option>
                        <option value="Practice">Practice</option>
                        <option value="Scrimmage">Scrimmage</option>
                        <option value="Game">Game</option>
                        <option value="Tournament">Tournament</option>
                        <option value="Volunteer">Volunteer</option>
                        <option value="Off-Ice">Off-Ice</option>
                      </select>
                    </label>
                    <label>
                      Event type override
                      <select name="eventTypeId" defaultValue={event.eventTypeId || ""}>
                        <option value="">Use preset/default</option>
                        {eventTypes.map((eventType) => (
                          <option key={eventType.id} value={eventType.id}>{eventType.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Signup flow
                      <select
                        name="signupMode"
                        defaultValue={signupConfigsByEvent[event.id]?.signupMode || "straight_rsvp"}
                      >
                        <option value="straight_rsvp">Straight RSVP (unlimited)</option>
                        <option value="interest_gathering">Interest gathering (roster selected by Hockey Ops)</option>
                      </select>
                    </label>
                    <input name="locationPublic" defaultValue={event.locationPublic || ""} placeholder="Public location" />
                    <label>
                      Public details
                      <input name="publicDetails" defaultValue={event.publicDetails} required />
                    </label>
                    <label>
                      <input name="published" type="checkbox" defaultChecked={event.published} /> Publish to public feed
                    </label>

                    <details className="event-card admin-disclosure">
                      <summary>Step 2: Team + Visibility (advanced)</summary>
                      <input name="locationPrivate" defaultValue={event.locationPrivate || ""} placeholder="Private location (players/admin)" />
                      <label>
                        Game manager
                        <select name="managerUserId" defaultValue={event.managerUserId || ""}>
                          <option value="">No manager assigned</option>
                          {approvedPlayers.map((member) => (
                            <option key={member.id} value={member.id}>{member.fullName}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Private details
                        <input name="privateDetails" defaultValue={event.privateDetails} />
                      </label>
                      <label>
                        Visibility
                        <select name="visibility" defaultValue={event.visibility}>
                          <option value="public">Public</option>
                          <option value="player_only">Player only</option>
                          <option value="internal">Internal (admin only)</option>
                        </select>
                      </label>
                    </details>

                    <details className="event-card admin-disclosure">
                      <summary>Step 3: Interest + Guest Rules (optional)</summary>
                      <label>
                        Interest closes at
                        <input
                          name="interestClosesAt"
                          type="datetime-local"
                          defaultValue={
                            signupConfigsByEvent[event.id]?.interestClosesAt
                              ? new Date(signupConfigsByEvent[event.id]!.interestClosesAt!).toISOString().slice(0, 16)
                              : ""
                          }
                        />
                      </label>
                      <label>
                        Target roster size
                        <input
                          name="targetRosterSize"
                          type="number"
                          min={1}
                          step={1}
                          defaultValue={signupConfigsByEvent[event.id]?.targetRosterSize || ""}
                          placeholder="Optional"
                        />
                      </label>
                      <label>
                        <input
                          name="allowGuestRequests"
                          type="checkbox"
                          defaultChecked={Boolean(signupConfigsByEvent[event.id]?.allowGuestRequests)}
                        />{" "}
                        Allow players to request guests (disabled for DVHL)
                      </label>
                      <label>
                        <input
                          name="requiresUsaHockeyVerified"
                          type="checkbox"
                          defaultChecked={Boolean(signupConfigsByEvent[event.id]?.requiresUsaHockeyVerified)}
                        />{" "}
                        Require verified USA Hockey number
                      </label>
                      <label>
                        <input
                          name="guestCostEnabled"
                          type="checkbox"
                          defaultChecked={Boolean(signupConfigsByEvent[event.id]?.guestCostEnabled)}
                        />{" "}
                        Guest cost applies
                      </label>
                      <input
                        name="guestCostLabel"
                        placeholder="Guest cost label (e.g., hotel fee)"
                        defaultValue={signupConfigsByEvent[event.id]?.guestCostLabel || ""}
                      />
                      <input
                        name="guestCostAmountUsd"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Guest cost amount (USD)"
                        defaultValue={signupConfigsByEvent[event.id]?.guestCostAmountUsd ?? ""}
                      />
                    </details>

                    <details className="event-card admin-disclosure">
                      <summary>Step 4: Maps + Images (optional)</summary>
                      <p className="muted">
                        Map links auto-generate from entered addresses. Only fill these when you need an override.
                      </p>
                      <input name="locationPublicMapUrl" defaultValue={event.locationPublicMapUrl || ""} placeholder="Public maps URL override (optional)" />
                      <input name="locationPrivateMapUrl" defaultValue={event.locationPrivateMapUrl || ""} placeholder="Private maps URL override (optional)" />
                      <label>
                        Hero image from media library
                        <select name="heroImageChoice" defaultValue="">
                          <option value="">Keep current</option>
                          {showcasePhotos.map((photo) => (
                            <option key={`hero-edit-${event.id}-${photo.id}`} value={photo.imageUrl}>
                              [{photo.gallery}] {photo.fileName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <input
                        name="heroImageUrl"
                        defaultValue={signupConfigsByEvent[event.id]?.heroImageUrl || ""}
                        placeholder="Hero image URL (optional override)"
                      />
                      <label>
                        Thumbnail from media library
                        <select name="thumbnailImageChoice" defaultValue="">
                          <option value="">Keep current</option>
                          {showcasePhotos.map((photo) => (
                            <option key={`thumb-edit-${event.id}-${photo.id}`} value={photo.imageUrl}>
                              [{photo.gallery}] {photo.fileName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <input
                        name="thumbnailImageUrl"
                        defaultValue={signupConfigsByEvent[event.id]?.thumbnailImageUrl || ""}
                        placeholder="Thumbnail URL (optional override)"
                      />
                    </details>
                    <button className="button" type="submit">Update Event</button>
                  </form>
                  {signupConfigsByEvent[event.id]?.signupMode === "interest_gathering" ? (
                    <div className="stack">
                      <strong>Final Roster Selection</strong>
                      {isInterestSignupClosed(signupConfigsByEvent[event.id]) ? (
                        <p className="muted">Interest window has closed. Select the final roster below.</p>
                      ) : (
                        <p className="muted">Interest is still open. You can still pre-select and adjust roster.</p>
                      )}
                      <form className="grid-form" action="/api/admin/events/interest-roster/generate" method="post">
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="returnTo" value={`/admin?section=${returnSection}`} />
                        <label>
                          <input
                            type="checkbox"
                            name="respectCloseWindow"
                            value="1"
                            defaultChecked
                          />{" "}
                          Only allow auto-generate after interest closes
                        </label>
                        <button className="button ghost" type="submit">
                          Auto-generate final roster from interest list
                        </button>
                      </form>
                      <form className="grid-form" action="/api/admin/events/interest-roster/select" method="post">
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="returnTo" value={`/admin?section=${returnSection}`} />
                        <div className="stack">
                          {(reservationBoards.byEvent[event.id] || [])
                            .filter((entry) => entry.status !== "not_going")
                            .map((entry) => (
                              <label key={`${event.id}-${entry.userId}`}>
                                <input
                                  type="checkbox"
                                  name="selectedUserIds"
                                  value={entry.userId}
                                  defaultChecked={
                                    (rosterSelectionsByEvent[event.id]?.selectedUserIds || []).includes(entry.userId)
                                  }
                                />{" "}
                                {entry.fullName} ({entry.status.replaceAll("_", " ")})
                              </label>
                            ))}
                          {(reservationBoards.byEvent[event.id] || []).filter((entry) => entry.status !== "not_going")
                            .length === 0 ? <p className="muted">No interested signups yet.</p> : null}
                        </div>
                        <button className="button alt" type="submit">Save Final Roster</button>
                      </form>
                    </div>
                  ) : null}
                  {canEventCollectGuests(signupConfigsByEvent[event.id], event.eventTypeName) ? (
                    <div className="stack">
                      <strong>Guest Requests</strong>
                      {signupConfigsByEvent[event.id]?.guestCostEnabled ? (
                        <p className="muted">
                          Cost: {signupConfigsByEvent[event.id]?.guestCostLabel || "Guest fee"}{" "}
                          {typeof signupConfigsByEvent[event.id]?.guestCostAmountUsd === "number"
                            ? `($${signupConfigsByEvent[event.id]!.guestCostAmountUsd!.toFixed(2)} per guest)`
                            : ""}
                        </p>
                      ) : (
                        <p className="muted">No guest fee configured.</p>
                      )}
                      {(guestIntentsByEvent[event.id] || []).length > 0 ? (
                        (guestIntentsByEvent[event.id] || []).map((intent) => {
                          const member = store.users.find((entry) => entry.id === intent.userId);
                          return (
                            <div key={`${event.id}-${intent.userId}`} className="event-card">
                              <strong>{member?.fullName || "Player"}</strong>
                              <p>
                                Guest request: {intent.wantsGuest ? `Yes (${intent.guestCount})` : "No"}
                              </p>
                              {intent.note ? <p>Note: {intent.note}</p> : null}
                            </div>
                          );
                        })
                      ) : (
                        <p className="muted">No guest requests yet.</p>
                      )}
                    </div>
                  ) : null}
                  <form action="/api/admin/events/delete" method="post">
                    <input type="hidden" name="eventId" value={event.id} />
                    <button className="button alt" type="submit">Delete Event</button>
                  </form>
                </details>
              ))}
              {scopedEvents.length === 0 && <p className="muted">No events in this category yet.</p>}
            </div>
          </details>

          <details className="card admin-disclosure">
            <summary>Public Event API</summary>
            <p className="muted">Public feed URL for website/mobile integrations:</p>
            <code>{`${process.env.NEXT_PUBLIC_SITE_URL || "https://pghwarriorhockey.us"}/api/public/events`}</code>
            <p className="muted">
              Only events marked <strong>Public</strong> and <strong>Published</strong> appear in this feed.
            </p>
          </details>
          </>
            ); 
          })()}
        </div>
      )}

      {section === "usermanagement" && (
        <div className="stack">
          <article className="card">
            <h3>Non-Player User Management</h3>
            <p className="muted">
              Manage users who are not players, plus role-based access to Hockey Ops tools.
            </p>
            <p className="muted">
              To make someone both player + admin, keep account role as <strong>player</strong> and assign Ops role(s)
              below. They will keep Player Hub and also gain Hockey Ops access.
            </p>
          </article>

          <details className="card admin-disclosure" open>
            <summary>Access Controls (Non-Players)</summary>
            <div className="stack">
              {nonPlayerUsers.map((member) => (
                <form
                  key={member.id}
                  className="event-card grid-form"
                  action={`/api/admin/users/${member.id}/access`}
                  method="post"
                >
                  <input type="hidden" name="returnTo" value="/admin?section=usermanagement" />
                  <strong>{member.fullName}</strong>
                  <p>{member.email}</p>
                  <p>Current role: {member.role} | Status: {member.status}</p>
                  <p>
                    Ops roles: {(roleAssignmentsByUserId.get(member.id) || []).length > 0
                      ? roleAssignmentsByUserId.get(member.id)!.map((entry) => entry.titleLabel).join(", ")
                      : "None"}
                  </p>
                  <label>
                    Set role
                    <select name="role" defaultValue={member.role}>
                      <option value="public">Public</option>
                      <option value="player">Player</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <button className="button ghost" type="submit">Update Access</button>
                </form>
              ))}
              {nonPlayerUsers.length === 0 ? <p className="muted">No non-player users yet.</p> : null}
            </div>
          </details>

          {actorIsSuperAdmin ? (
            <details className="card admin-disclosure" open>
              <summary>Player + Admin Access</summary>
              <p className="muted">
                Keep player role as <strong>player</strong>. Assign one or more Ops roles below to grant Hockey Ops HQ access
                while preserving Player HQ access.
              </p>
              <div className="stack">
                {approvedPlayers.map((member) => (
                  <form
                    key={`${member.id}-player-ops-role`}
                    className="event-card grid-form"
                    action={`/api/admin/users/${member.id}/ops-role`}
                    method="post"
                  >
                    <input type="hidden" name="returnTo" value="/admin?section=usermanagement" />
                    <strong>{member.fullName}</strong>
                    <p>{member.email}</p>
                    <p>
                      Base role: {member.role} | Current Ops roles: {(roleAssignmentsByUserId.get(member.id) || []).length > 0
                        ? roleAssignmentsByUserId.get(member.id)!.map((entry) => entry.titleLabel).join(", ")
                        : "None"}
                    </p>
                    <label>
                      Assign Ops role
                      <select name="roleKey" defaultValue="">
                        <option value="">Select role</option>
                        {roleDefinitions
                          .filter((entry) => actorIsSuperAdmin || entry.key !== "super_admin")
                          .map((entry) => (
                          <option key={entry.key} value={entry.key}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <input name="titleLabel" placeholder="Title label override (optional)" />
                    <input name="officialEmail" placeholder="Official team email (optional)" />
                    <input name="badgeLabel" placeholder="Badge label (optional)" />
                    <label>
                      <input name="clearRoles" type="checkbox" /> Clear all ops roles for this player
                    </label>
                    <button className="button ghost" type="submit">Save Player Ops Role</button>
                  </form>
                ))}
                {approvedPlayers.length === 0 ? <p className="muted">No approved players yet.</p> : null}
              </div>
            </details>
          ) : null}

          {actorIsSuperAdmin ? (
            <details className="card admin-disclosure" open>
              <summary>Ops Role Assignments</summary>
              <div className="stack">
                {store.users.map((member) => (
                  <form
                    key={`${member.id}-ops-role-usermanagement`}
                    className="event-card grid-form"
                    action={`/api/admin/users/${member.id}/ops-role`}
                    method="post"
                  >
                    <input type="hidden" name="returnTo" value="/admin?section=usermanagement" />
                    <strong>{member.fullName}</strong>
                    <p>{member.email}</p>
                    <label>
                      Role
                      <select name="roleKey" defaultValue="">
                        <option value="">Select role</option>
                        {roleDefinitions
                          .filter((entry) => actorIsSuperAdmin || entry.key !== "super_admin")
                          .map((entry) => (
                          <option key={entry.key} value={entry.key}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <input name="titleLabel" placeholder="Title label override (optional)" />
                    <input name="officialEmail" placeholder="Official team email (optional)" />
                    <input name="badgeLabel" placeholder="Badge label (optional)" />
                    <label>
                      <input name="clearRoles" type="checkbox" /> Clear all ops roles for this user
                    </label>
                    <button className="button ghost" type="submit">Save Ops Roles</button>
                  </form>
                ))}
              </div>
            </details>
          ) : null}
        </div>
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
            <h3>Roster Setup Flow</h3>
            <p className="muted">
              Legacy roster-import and reservation-lock tooling is retired. Use <strong>Users & Applications</strong> for approvals,
              then complete placements in <strong>Central Roster Manager</strong>.
            </p>
            <p>
              <Link className="button ghost" href="/admin/roster">
                Open Central Roster Manager
              </Link>
            </p>
          </article>

          <details className="card admin-disclosure" open>
            <summary>User Access Controls</summary>
            <p className="muted">
              Grant or revoke admin access. Role changes apply immediately.
            </p>
            <div className="stack">
              {store.users.map((member) => (
                <form
                  key={member.id}
                  className="event-card grid-form"
                  action={`/api/admin/users/${member.id}/access`}
                  method="post"
                >
                  <strong>{member.fullName}</strong>
                  <p>{member.email}</p>
                  <p>Current role: {member.role} | Status: {member.status}</p>
                  <p>
                    Ops roles: {(roleAssignmentsByUserId.get(member.id) || []).length > 0
                      ? roleAssignmentsByUserId.get(member.id)!.map((entry) => entry.titleLabel).join(", ")
                      : "None"}
                  </p>
                  <label>
                    Set role
                    <select name="role" defaultValue={member.role}>
                      <option value="public">Public</option>
                      <option value="player">Player</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <button className="button ghost" type="submit">Update Access</button>
                </form>
              ))}
            </div>
            {actorIsSuperAdmin ? (
              <div className="stack">
                <h4>Assign Ops Leadership Roles</h4>
                {store.users.map((member) => (
                  <form
                    key={`${member.id}-ops-role`}
                    className="event-card grid-form"
                    action={`/api/admin/users/${member.id}/ops-role`}
                    method="post"
                  >
                    <strong>{member.fullName}</strong>
                    <p>{member.email}</p>
                    <label>
                      Role
                      <select name="roleKey" defaultValue="">
                        <option value="">Select role</option>
                        {roleDefinitions.map((entry) => (
                          <option key={entry.key} value={entry.key}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <input name="titleLabel" placeholder="Title label override (optional)" />
                    <input name="officialEmail" placeholder="Official team email (optional)" />
                    <input name="badgeLabel" placeholder="Badge label (optional)" />
                    <label>
                      <input name="clearRoles" type="checkbox" /> Clear all ops roles for this user
                    </label>
                    <button className="button ghost" type="submit">Save Ops Roles</button>
                  </form>
                ))}
              </div>
            ) : null}
          </details>

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
                      Assign main roster
                      <select name="rosterId" required defaultValue="main-player-roster">
                        <option value="main-player-roster">Main Player Roster</option>
                      </select>
                    </label>
                    <label>
                      Primary sub-roster
                      <select name="primarySubRoster" required defaultValue="">
                        <option value="" disabled>Select color roster</option>
                        <option value="gold">Gold (highest skill)</option>
                        <option value="white">White (tweener)</option>
                        <option value="black">Black (developing)</option>
                      </select>
                    </label>
                    <label>
                      <input type="checkbox" name="allowCrossColorJerseyOverlap" /> Allow cross-color number overlap
                      (gold/black policy)
                    </label>
                    <label>
                      Initial jersey number (optional)
                      <input name="jerseyNumber" type="number" min="1" max="99" />
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
                      Ops roles: {(roleAssignmentsByUserId.get(player.id) || []).length > 0
                        ? roleAssignmentsByUserId.get(player.id)!.map((entry) => entry.titleLabel).join(", ")
                        : "None"}
                    </p>
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

      {section === "fundraising" && (
        <article className="card">
          <h3>Donation Intake Queue</h3>
          <p className="muted">
            This is the local donation lead queue while payment rails are being finalized. Next step is Stripe checkout + webhook reconciliation.
          </p>
          <div className="admin-kpi-grid">
            <div className="admin-kpi">
              <span className="muted">Donation intents</span>
              <strong>{donationLedgerSummary.intentCount}</strong>
            </div>
            <div className="admin-kpi">
              <span className="muted">Stripe payments</span>
              <strong>{donationLedgerSummary.paymentCount}</strong>
            </div>
            <div className="admin-kpi">
              <span className="muted">Paid total</span>
              <strong>${donationLedgerSummary.totalPaidUsd.toFixed(2)}</strong>
            </div>
            <div className="admin-kpi">
              <span className="muted">Unmatched payments</span>
              <strong>{donationLedgerSummary.unmatchedPayments.length}</strong>
            </div>
          </div>
          <div className="stack">
            {donationIntents.map((entry) => (
              <form key={entry.id} className="event-card grid-form" action="/api/admin/donations/status" method="post">
                <input type="hidden" name="id" value={entry.id} />
                <strong>{entry.fullName}</strong>
                <p>{entry.email}</p>
                <p>
                  {entry.amountUsd ? `$${entry.amountUsd.toFixed(2)}` : "Amount not set"} | {entry.frequency} | source: {entry.source}
                </p>
                {entry.message ? <p className="muted">{entry.message}</p> : null}
                <p className="muted">Created: {new Date(entry.createdAt).toLocaleString()}</p>
                <label>
                  Status
                  <select name="status" defaultValue={entry.status}>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="processed">Processed</option>
                  </select>
                </label>
                <button className="button ghost" type="submit">Update Donation Status</button>
              </form>
            ))}
            {donationIntents.length === 0 ? <p className="muted">No donation requests yet.</p> : null}
          </div>
          <h4>Stripe Payment Ledger</h4>
          <div className="stack">
            {donationPayments.map((payment) => (
              <div key={payment.id} className="event-card">
                <strong>{payment.donorName || payment.donorEmail || "Unknown donor"}</strong>
                <p>
                  ${payment.amountUsd.toFixed(2)} {payment.currency.toUpperCase()} | {payment.status}
                </p>
                <p className="muted">
                  Checkout session: {payment.stripeCheckoutSessionId}
                  {payment.stripePaymentIntentId ? ` | Payment intent: ${payment.stripePaymentIntentId}` : ""}
                </p>
                <p className="muted">
                  Linked intent: {payment.intentId || "none"} | Updated: {new Date(payment.updatedAt).toLocaleString()}
                </p>
              </div>
            ))}
            {donationPayments.length === 0 ? <p className="muted">No Stripe payment records yet.</p> : null}
          </div>
        </article>
      )}

      {section === "attendance" && (
        <article className="card">
          <h3>Attendance Audit by Event</h3>
          {attendanceInsights.fallbackMode ? (
            <p className="muted">
              Fallback file mode detected. RSVP analytics are approximate until database mode is enabled.
            </p>
          ) : null}
          <div className="admin-kpi-grid">
            <div className="admin-kpi">
              <span className="muted">RSVP then no-show</span>
              <strong>{attendanceInsights.totals.noShowAfterRsvp}</strong>
            </div>
            <div className="admin-kpi">
              <span className="muted">Showed w/o RSVP</span>
              <strong>{attendanceInsights.totals.walkInWithoutRsvp}</strong>
            </div>
            <div className="admin-kpi">
              <span className="muted">RSVP no, still attended</span>
              <strong>{attendanceInsights.totals.attendedAfterNotGoing}</strong>
            </div>
            <div className="admin-kpi">
              <span className="muted">Tracked members</span>
              <strong>{attendanceInsights.totalMembers}</strong>
            </div>
          </div>
          <div className="stack">
            {attendanceByEvent.map((entry) => (
              <div key={entry.eventId} className="event-card">
                <strong>{entry.title}</strong>
                <p>Checked in + attended: {entry.checkedInAttended}</p>
                <p>Checked in + no-show: {entry.checkedInNoShow}</p>
                <p>Walk-in attended: {entry.walkInAttended}</p>
                <p>Absent: {entry.absent}</p>
                {(() => {
                  const insight = attendanceInsights.eventInsights.find((event) => event.eventId === entry.eventId);
                  if (!insight) {
                    return null;
                  }
                  return (
                    <>
                      <p className="muted">
                        RSVP: going {insight.reservationsGoing}, maybe {insight.reservationsMaybe}, not going{" "}
                        {insight.reservationsNotGoing}
                      </p>
                      <p className="muted">
                        Reliability: RSVP no-shows {insight.noShowAfterRsvpCount}, no-RSVP attendees{" "}
                        {insight.walkInWithoutRsvpCount}, attended after not-going {insight.attendedAfterNotGoingCount}
                      </p>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
          <h3>Player Reliability Signals</h3>
          <div className="stack">
            {attendanceInsights.topNoShows.slice(0, 20).map((entry) => (
              <div key={entry.userId} className="event-card">
                <strong>{entry.fullName}</strong>
                <p>{entry.email}</p>
                <p>
                  RSVP no-shows: {entry.noShowAfterRsvp} | Walk-ins without RSVP: {entry.walkInWithoutRsvp} |
                  Attended after not-going: {entry.attendedAfterNotGoing}
                </p>
              </div>
            ))}
            {attendanceInsights.topNoShows.length === 0 ? (
              <p className="muted">No reliability exceptions recorded yet.</p>
            ) : null}
          </div>
        </article>
      )}
        </div>
      </div>
    </section>
  );
}
