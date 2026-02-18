import { redirect } from "next/navigation";
import { events } from "@/lib/mockData";
import { getCurrentUser } from "@/lib/hq/session";

export const dynamic = "force-dynamic";

export default async function CheckInPage({
  searchParams
}: {
  searchParams?: { saved?: string; error?: string };
}) {
  const query = searchParams ?? {};
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?error=sign_in_required");
  }

  if (user.role !== "admin" && (user.role !== "player" || user.status !== "approved" || !user.rosterId)) {
    redirect("/player?error=approval_required");
  }

  return (
    <section className="card">
      <h2>Player Check-In</h2>
      <p>Signed in as {user.fullName}. Submit check-in for active events.</p>
      {query.saved === "1" && <p className="badge">Check-in recorded.</p>}
      {query.error && <p className="muted">{query.error.replaceAll("_", " ")}</p>}
      <div className="stack">
        {events.map((event) => (
          <form key={event.id} className="event-card stack" action="/api/checkin" method="post">
            <h3>{event.title}</h3>
            <p>{new Date(event.date).toLocaleString()}</p>
            <input type="hidden" name="eventId" value={event.id} />
            <label>
              Attendance status
              <select name="attendanceStatus" defaultValue="checked_in_attended" required>
                <option value="checked_in_attended">Checked in + attended</option>
                <option value="checked_in_no_show">Checked in + no-show</option>
                <option value="walk_in_attended">Walk-in attended</option>
                <option value="absent">Absent</option>
              </select>
            </label>
            <label>
              Notes
              <input name="note" placeholder="Optional notes" />
            </label>
            <button className="button" type="submit">Submit Check-In</button>
          </form>
        ))}
      </div>
    </section>
  );
}
