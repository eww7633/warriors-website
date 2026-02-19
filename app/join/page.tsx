import Link from "next/link";

export default function JoinPage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  const query = searchParams ?? {};

  return (
    <section className="stack">
      <article className="card join-hero">
        <p className="eyebrow">Join The Program</p>
        <h1>Request Player Access</h1>
        <p className="hero-lead">
          Veterans can submit a registration request to join Pittsburgh Warriors Hockey. Hockey Ops reviews each
          request and assigns roster placement after approval.
        </p>
      </article>

      <article className="card stack">
        <h2>Player Registration Request</h2>
        <p>
          Submit your request below. Once approved, you can access Warrior HQ tools for events, attendance, and
          player resources.
        </p>
        {query.error && <p className="muted">{query.error.replaceAll("_", " ")}</p>}
        <form className="grid-form" action="/api/auth/register" method="post">
          <input name="fullName" placeholder="Full name" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Create password" minLength={8} required />
          <input name="phone" placeholder="Phone" />
          <input name="addressLine1" placeholder="Address line 1" />
          <input name="addressLine2" placeholder="Address line 2 (optional)" />
          <input name="city" placeholder="City" />
          <input name="stateProvince" placeholder="State/Province" />
          <input name="postalCode" placeholder="ZIP/Postal code" />
          <input name="country" placeholder="Country" defaultValue="USA" />
          <input name="usaHockeyNumber" placeholder="USA Hockey number (if you have one)" />
          <select name="position" required>
            <option value="">Preferred position</option>
            <option value="F">Forward</option>
            <option value="D">Defense</option>
            <option value="G">Goalie</option>
          </select>
          <button className="button" type="submit">Submit Request</button>
        </form>
        <p>
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </article>
    </section>
  );
}
