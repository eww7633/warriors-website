import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/hq/session";
import { listCentralRosterPlayers } from "@/lib/hq/roster";

export const dynamic = "force-dynamic";

type SortField = "name" | "number" | "roster" | "activity" | "updated";
type SortDir = "asc" | "desc";
type ActivityFilter = "all" | "active" | "inactive";

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
  };
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?error=sign_in_required");
  }

  if (user.role !== "admin") {
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

  const players = await listCentralRosterPlayers();
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
        {query.error && (
          <p className="muted">
            {query.error === "number_conflict"
              ? `Number conflict: already assigned to ${query.conflictPlayer ?? "another player"}. Only force overlap if players will not be rostered together in tournaments.`
              : query.error === "shared_tournament_overlap"
              ? `Cannot force number overlap. ${query.conflictPlayer ?? "This player"} shares tournament history with this player: ${query.sharedTournaments ?? "Unknown tournament"}.`
              : query.error.replaceAll("_", " ")}
          </p>
        )}
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
                  <form className="grid-form" action="/api/admin/roster/update" method="post">
                    <input type="hidden" name="userId" value={player.id} />
                    <input name="fullName" defaultValue={player.fullName} required />
                    <input name="rosterId" defaultValue={player.rosterId ?? ""} placeholder="Roster ID" />
                    <input
                      name="jerseyNumber"
                      type="number"
                      min="1"
                      max="99"
                      defaultValue={player.jerseyNumber ?? ""}
                      placeholder="Jersey #"
                    />
                    <label>
                      Activity
                      <select name="activityStatus" defaultValue={player.activityStatus}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </label>
                    <label>
                      <input type="checkbox" name="forceNumberOverlap" /> Allow number overlap (only if players will never share a tournament roster)
                    </label>
                    <button className="button" type="submit">Save</button>
                  </form>
                  <form className="grid-form" action="/api/admin/roster/photos/add" method="post">
                    <input type="hidden" name="userId" value={player.id} />
                    <input name="imageUrl" placeholder="Photo URL (https://...)" required />
                    <input name="caption" placeholder="Caption (optional)" />
                    <label>
                      <input type="checkbox" name="makePrimary" defaultChecked /> Set as primary photo
                    </label>
                    <button className="button ghost" type="submit">Add Photo</button>
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
