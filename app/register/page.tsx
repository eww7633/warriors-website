import Link from "next/link";

export default function RegisterPage({
  searchParams
}: {
  searchParams: { error?: string };
}) {
  return (
    <section className="card stack">
      <h2>Player Registration Request</h2>
      <p>
        Submit your player request. Hockey Ops must approve and place you on a roster before
        HQ access is granted.
      </p>
      {searchParams.error && <p className="muted">{searchParams.error.replaceAll("_", " ")}</p>}
      <form className="grid-form" action="/api/auth/register" method="post">
        <input name="fullName" placeholder="Full name" required />
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Create password" minLength={8} required />
        <input name="phone" placeholder="Phone" />
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
    </section>
  );
}
