import { redirect } from "next/navigation";
import { events, roster } from "@/lib/mockData";
import { getCurrentUser } from "@/lib/hq/session";
import { readStore } from "@/lib/hq/store";

export const dynamic = "force-dynamic";

export default async function PlayerPage({
  searchParams
}: {
  searchParams?: { saved?: string; error?: string };
}) {
  const query = searchParams ?? {};
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?error=sign_in_required");
  }

  if (user.role === "admin") {
    redirect("/admin");
  }

  const store = await readStore();
  const latestUser = store.users.find((entry) => entry.id === user.id) ?? user;
  const checkIns = store.checkIns.filter((entry) => entry.userId === latestUser.id).slice(-10).reverse();

  return (
    <section className="stack">
      <article className="card">
        <h2>Player Portal</h2>
        <p>
          Signed in as <strong>{latestUser.fullName}</strong> ({latestUser.email})
        </p>
        <p>Status: <strong>{latestUser.status}</strong></p>
        {query.saved === "equipment" && <p className="badge">Equipment profile saved.</p>}
        {query.error && <p className="muted">{query.error.replaceAll("_", " ")}</p>}
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
          </>
        )}
      </article>

      <article className="card">
        <h3>Equipment and Clothing Sizes</h3>
        <form className="grid-form" action="/api/player/equipment" method="post">
          <input name="helmet" placeholder="Helmet size" defaultValue={latestUser.equipmentSizes.helmet || ""} />
          <input name="gloves" placeholder="Glove size" defaultValue={latestUser.equipmentSizes.gloves || ""} />
          <input name="skates" placeholder="Skate size" defaultValue={latestUser.equipmentSizes.skates || ""} />
          <input name="pants" placeholder="Pants size" defaultValue={latestUser.equipmentSizes.pants || ""} />
          <input name="stick" placeholder="Stick specs" defaultValue={latestUser.equipmentSizes.stick || ""} />
          <input name="jersey" placeholder="Jersey size" defaultValue={latestUser.equipmentSizes.jersey || ""} />
          <input name="shell" placeholder="Shell size" defaultValue={latestUser.equipmentSizes.shell || ""} />
          <input name="warmupTop" placeholder="Warmup top size" defaultValue={latestUser.equipmentSizes.warmupTop || ""} />
          <input name="warmupBottom" placeholder="Warmup bottom size" defaultValue={latestUser.equipmentSizes.warmupBottom || ""} />
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
