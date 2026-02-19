import Link from "next/link";
import { getCurrentUser } from "@/lib/hq/session";

export default async function CheckInScanPage({
  searchParams
}: {
  searchParams?: {
    token?: string;
    checkedIn?: string;
    error?: string;
  };
}) {
  const query = searchParams ?? {};
  const token = (query.token || "").trim();
  const user = await getCurrentUser();

  return (
    <section className="card stack">
      <h2>QR Event Check-In</h2>
      {!user && (
        <p>
          You need to sign in first. <Link href="/login">Sign in here</Link>, then return to this scan page.
        </p>
      )}
      {user && (
        <>
          <p>Signed in as {user.fullName}.</p>
          {query.checkedIn === "1" && <p className="badge">Check-in recorded.</p>}
          {query.error && <p className="muted">{query.error}</p>}
          {!token ? (
            <p className="muted">No token detected. Scan a valid event QR code.</p>
          ) : (
            <form className="grid-form" action="/api/events/checkin/scan" method="post">
              <input type="hidden" name="token" value={token} />
              <p>
                Token loaded. Tap confirm to complete check-in for this event.
              </p>
              <button className="button" type="submit">Confirm Check-In</button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
