import { siteConfig } from "@/lib/siteConfig";
import { listPublicSponsors } from "@/lib/hq/ops-data";

export const dynamic = "force-dynamic";

const sponsorPillars = [
  "Ice time and training resources",
  "Travel and tournament logistics",
  "Equipment support for veterans",
  "Year-round community programming"
];

export default async function PartnersPage() {
  const sponsors = await listPublicSponsors();

  return (
    <section className="stack">
      <article className="card partner-hero">
        <p className="eyebrow">Partners & Sponsors</p>
        <h1>Community Partners Who Keep Veterans On The Ice</h1>
        <p className="hero-lead">
          The Pittsburgh Warriors are powered by mission-aligned partners who invest directly in veteran healing,
          team operations, and long-term program sustainability.
        </p>
        <div className="mission-list">
          {sponsorPillars.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
        <div className="cta-row">
          <a className="button alt" href="/donate">
            Become A Supporter
          </a>
          <a className="button ghost" href="/join">
            Contact The Program
          </a>
        </div>
      </article>

      <article className="card">
        <div className="section-heading">
          <h2>Active Sponsors</h2>
          <a href={siteConfig.social.instagram} target="_blank" rel="noreferrer">
            Sponsor highlights
          </a>
        </div>
        <div className="about-card-grid">
          {sponsors.map((sponsor) => (
            <article key={sponsor.id} className="event-card partner-card">
              <h3>{sponsor.name}</h3>
              {sponsor.notes ? <p>{sponsor.notes}</p> : null}
              <p className="muted">
                Impressions: {sponsor.impressions} | Clicks: {sponsor.clicks}
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
                <p className="muted">Website coming soon.</p>
              )}
            </article>
          ))}
          {sponsors.length === 0 ? <p className="muted">No active sponsors published yet.</p> : null}
        </div>
      </article>
    </section>
  );
}
