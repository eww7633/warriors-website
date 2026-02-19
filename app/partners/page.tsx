import { listPublicSponsors } from "@/lib/hq/ops-data";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const sponsors = await listPublicSponsors();

  return (
    <section className="stack">
      <article className="card">
        <p className="eyebrow">Program Supporters</p>
        <h2>Partners & Sponsors</h2>
        <p>
          These organizations help power Pittsburgh Warriors Hockey Club. Visiting partner links
          supports sponsor reporting in Warrior HQ.
        </p>
      </article>

      <article className="card">
        <h3>Active Sponsors</h3>
        <div className="stack">
          {sponsors.map((sponsor) => (
            <div key={sponsor.id} className="event-card">
              <strong>{sponsor.name}</strong>
              {sponsor.notes && <p>{sponsor.notes}</p>}
              <p>
                <span className="muted">Tracked impressions:</span> {sponsor.impressions}
                {" | "}
                <span className="muted">Tracked clicks:</span> {sponsor.clicks}
              </p>
              {sponsor.websiteUrl ? (
                <a
                  className="button ghost"
                  href={`/api/sponsors/${sponsor.id}/click?to=${encodeURIComponent(sponsor.websiteUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Visit Sponsor
                </a>
              ) : (
                <p className="muted">No website URL configured.</p>
              )}
            </div>
          ))}
          {sponsors.length === 0 && <p className="muted">No active sponsors published yet.</p>}
        </div>
      </article>
    </section>
  );
}
