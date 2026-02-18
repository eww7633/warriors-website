import Link from "next/link";
import { getCurrentUser } from "@/lib/hq/session";
import { loginAction } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: { error?: string; registered?: string; logged_out?: string };
}) {
  const query = searchParams ?? {};
  const user = await getCurrentUser();

  if (user) {
    return (
      <section className="card stack">
        <h2>Already Signed In</h2>
        <p>You are signed in as {user.fullName}.</p>
        <div className="cta-row">
          <Link className="button" href={user.role === "admin" ? "/admin" : "/player"}>
            Go to Dashboard
          </Link>
          <form action="/api/auth/logout" method="post">
            <button className="button alt" type="submit">Log out</button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="card stack">
      <h2>Sign In</h2>
      {query.registered === "1" && (
        <p className="badge">Registration submitted. Wait for admin approval before HQ access.</p>
      )}
      {query.logged_out === "1" && <p className="badge">You have been logged out.</p>}
      {query.error && <p className="muted">{query.error.replaceAll("_", " ")}</p>}
      <form className="grid-form" action={loginAction}>
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />
        <button className="button" type="submit">Sign In</button>
      </form>
      <p>
        Need an account? <Link href="/register">Request player access</Link>
      </p>
    </section>
  );
}
