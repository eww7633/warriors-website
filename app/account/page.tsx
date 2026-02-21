import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams
}: {
  searchParams?: { saved?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?error=sign_in_required");
  }
  const hasOpsAccess = await canAccessAdminPanel(user);
  const hasHqAccess = user.status === "approved" && (user.role === "player" || user.role === "admin");
  const canApplyAsPlayer = user.role === "public" && user.status !== "pending";

  const query = searchParams ?? {};

  return (
    <section className="stack">
      <article className="card">
        <p className="eyebrow">Account</p>
        <h1>My Account</h1>
        <p className="muted">Manage your website account details.</p>
        <div className="cta-row">
          {hasHqAccess ? (
            <Link className="button ghost" href="/player">
              Open Player HQ
            </Link>
          ) : null}
          {hasOpsAccess ? (
            <Link className="button ghost" href="/admin">
              Open Hockey Ops
            </Link>
          ) : null}
        </div>
        {query.saved === "1" ? <p className="badge">Account updated.</p> : null}
        {query.saved === "player_application" ? <p className="badge">Player application submitted to Hockey Ops.</p> : null}
        {query.error ? <p className="muted">{query.error.replaceAll("_", " ")}</p> : null}
      </article>

      <article className="card">
        <h3>Profile & Login</h3>
        <form className="grid-form" action="/api/account/update" method="post">
          <input name="fullName" placeholder="Full name" defaultValue={user.fullName} required />
          <input name="email" type="email" placeholder="Email" defaultValue={user.email} required />
          <input name="phone" placeholder="Phone" defaultValue={user.phone || ""} />
          <input
            name="newPassword"
            type="password"
            minLength={8}
            placeholder="New password (optional, min 8 chars)"
          />
          <button className="button" type="submit">Save Account</button>
        </form>
      </article>

      {canApplyAsPlayer ? (
        <article className="card">
          <h3>Apply As Player</h3>
          <p className="muted">
            Supporters can apply to become players. Hockey Ops will review and approve your request.
          </p>
          <form className="grid-form" action="/api/account/apply-player" method="post">
            <select name="position" required defaultValue="">
              <option value="" disabled>Preferred position</option>
              <option value="F">Forward</option>
              <option value="D">Defense</option>
              <option value="G">Goalie</option>
            </select>
            <textarea
              name="playerExperienceSummary"
              rows={4}
              placeholder="Playing experience, current level, and goals"
              required
            />
            <input name="usaHockeyNumber" placeholder="USA Hockey number (optional)" />
            <label>
              <input name="needsEquipment" type="checkbox" /> I need help with equipment
            </label>
            <label>
              <input name="acceptCodeOfConduct" type="checkbox" required /> I agree to the player code of conduct
            </label>
            <button className="button" type="submit">Submit Player Application</button>
          </form>
        </article>
      ) : null}
    </section>
  );
}
