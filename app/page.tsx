import Link from "next/link";

export default function HomePage() {
  return (
    <section className="grid-home">
      <article className="card hero-card">
        <p className="eyebrow">Pittsburgh Disabled Veterans Hockey</p>
        <h2>Strength, service, and brotherhood on the ice</h2>
        <p>
          The Pittsburgh Warriors Hockey Club helps disabled veterans build routine,
          confidence, and connection through elite-level team hockey.
        </p>
        <div className="cta-row">
          <Link className="button" href="/player">
            Register as a Player
          </Link>
          <Link className="button alt" href="/donate">
            Support the Program
          </Link>
        </div>
      </article>

      <article className="card">
        <h3>What this platform includes</h3>
        <ul>
          <li>Player registration and profile onboarding</li>
          <li>Player tracking, roster visibility, and attendance check-in</li>
          <li>SportsPress-style game center with live game events</li>
          <li>Multiple rosters across active and archived seasons</li>
          <li>Operations dashboard for hockey staff</li>
          <li>Public-facing news, history, and donation tools</li>
          <li>Role-based calendar details for player privacy</li>
        </ul>
      </article>

      <article className="card">
        <h3>Program pillars</h3>
        <ul>
          <li>Competitive team hockey with multiple seasonal rosters</li>
          <li>Veteran wellness, discipline, and mission-focused support</li>
          <li>Community engagement and visibility for disabled veterans</li>
        </ul>
      </article>

      <article className="card">
        <h3>Role-aware operations</h3>
        <p>
          Public users see only event summaries. Players and administrators see logistics,
          check-in requirements, and private notes.
        </p>
      </article>
    </section>
  );
}
