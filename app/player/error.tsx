"use client";

import Link from "next/link";

export default function PlayerError({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section className="stack">
      <article className="card">
        <h2>Player Hub Error</h2>
        <p className="muted">
          We hit an unexpected rendering error in Warrior HQ. Refresh the page or try again.
        </p>
        <p className="muted">{error.message || "Unknown player hub error"}</p>
        <div className="cta-row">
          <button className="button" onClick={() => reset()}>
            Retry
          </button>
          <Link className="button ghost" href="/login">
            Return to login
          </Link>
        </div>
      </article>
    </section>
  );
}
