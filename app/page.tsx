import Link from "next/link";

export default function HomePage() {
  return (
    <section className="grid-home">
      <article className="card hero-card">
        <p className="eyebrow">Pittsburgh Disabled Veterans Hockey</p>
        <h2>Hockey Ops and player portal</h2>
        <p>
          Register to request player access. HQ access is only granted after Hockey Ops approves
          your account and assigns you to an official roster.
        </p>
        <div className="cta-row">
          <Link className="button" href="/register">
            Request Player Access
          </Link>
          <Link className="button alt" href="/login">
            Sign In
          </Link>
        </div>
      </article>

      <article className="card">
        <h3>HQ capabilities</h3>
        <ul>
          <li>Registration intake and approval workflow</li>
          <li>Roster assignment and jersey number control</li>
          <li>Equipment and clothing size records per player</li>
          <li>Attendance truth tracking for check-ins and actual arrival</li>
          <li>Season and game tracking with role-based data access</li>
        </ul>
      </article>

      <article className="card">
        <h3>Access policy</h3>
        <p>
          The HQ platform is for approved players and Hockey Ops personnel only.
          Pending registrations do not have access to roster-protected pages.
        </p>
      </article>
    </section>
  );
}
