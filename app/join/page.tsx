import Link from "next/link";

export default function JoinPage({
  searchParams
}: {
  searchParams?: { error?: string; mode?: string; email?: string; invite?: string };
}) {
  const query = searchParams ?? {};
  const mode = query.mode === "player" || query.mode === "supporter" ? query.mode : "player";
  const invitedEmail = (query.email || "").trim();
  const inviteLocked = query.invite === "1" && Boolean(invitedEmail);

  return (
    <section className="stack">
      <article className="card join-hero">
        <p className="eyebrow">Join The Program</p>
        <h1>Join As Supporter Or Player</h1>
        <p className="hero-lead">
          Create a supporter account for updates and donations, or apply for player access for full Warrior HQ participation.
        </p>
        <div className="cta-row">
          <Link className={`button ${mode === "supporter" ? "alt" : "ghost"}`} href="/join?mode=supporter">
            Join As Supporter
          </Link>
          <Link className={`button ${mode === "player" ? "alt" : "ghost"}`} href="/join?mode=player">
            Apply As Player
          </Link>
        </div>
      </article>

      {mode === "supporter" ? (
        <article className="card stack">
          <h2>Supporter Account</h2>
          <p>
            Supporters can log in, donate, and apply for player access later when ready.
          </p>
          <ol className="join-steps">
            <li>Create your supporter account.</li>
            <li>Confirm your email/login and explore events.</li>
            <li>Use the Join flow later if you decide to become a player.</li>
          </ol>
          {query.error && <p className="muted">{query.error.replaceAll("_", " ")}</p>}
        <form className="grid-form" action="/api/auth/register-supporter" method="post">
            <input type="hidden" name="inviteLinkUsed" value={inviteLocked ? "1" : "0"} />
            <input name="fullName" placeholder="Full name" required />
            <input
              name="email"
              type="email"
              placeholder="Email"
              defaultValue={invitedEmail}
              readOnly={inviteLocked}
              required
            />
            <input name="password" type="password" placeholder="Create password" minLength={8} required />
            <input name="phone" placeholder="Phone (optional)" />
            <button className="button" type="submit">Create Supporter Account</button>
          </form>
          <p>
            Want to play? <Link href="/join?mode=player">Apply as a player</Link>
          </p>
          <p>
            Already registered? <Link href="/login">Sign in</Link>
          </p>
        </article>
      ) : null}

      {mode === "player" ? (
      <article className="card stack">
        <h2>Player Registration Request</h2>
        <p>
          Submit your request below. Once approved, you can access Warrior HQ tools for events, attendance, and
          player resources.
        </p>
        <ol className="join-steps">
          <li>Submit your player request.</li>
          <li>Hockey Ops reviews and approves your account.</li>
          <li>After approval, complete your onboarding checklist inside Player HQ.</li>
        </ol>
        {query.error && <p className="muted">{query.error.replaceAll("_", " ")}</p>}
        {inviteLocked ? (
          <p className="badge">This invite is tied to {invitedEmail}. Use this email to link your account.</p>
        ) : null}
        <form className="grid-form" action="/api/auth/register" method="post">
          <input type="hidden" name="inviteLinkUsed" value={inviteLocked ? "1" : "0"} />
          <input name="fullName" placeholder="Full name" required />
          <input
            name="email"
            type="email"
            placeholder="Email"
            defaultValue={invitedEmail}
            readOnly={inviteLocked}
            required
          />
          <input name="password" type="password" placeholder="Create password" minLength={8} required />
          <input name="phone" placeholder="Phone" />
          <input name="usaHockeyNumber" placeholder="USA Hockey number (if you have one)" />
          <textarea
            name="playerExperienceSummary"
            rows={4}
            placeholder="Tell Hockey Ops about your playing experience, current level, and goals."
            required
          />
          <label>
            <input name="needsEquipment" type="checkbox" /> I need help with equipment
          </label>
          <label>
            <input name="acceptCodeOfConduct" type="checkbox" required /> I agree to the Pittsburgh Warriors player
            code of conduct.
          </label>
          <p className="muted">
            USA Hockey number is strongly recommended. Hockey Ops can manually verify and approve it for official on-ice
            competitions.
          </p>
          <select name="position" required>
            <option value="">Preferred position</option>
            <option value="F">Forward</option>
            <option value="D">Defense</option>
            <option value="G">Goalie</option>
          </select>
          <button className="button" type="submit">Submit Request</button>
        </form>
        <p className="muted">
          You will provide full address, equipment sizing, and profile details during onboarding after approval.
        </p>
        <p>
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </article>
      ) : null}
    </section>
  );
}
