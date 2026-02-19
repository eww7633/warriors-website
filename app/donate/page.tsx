import { siteConfig } from "@/lib/siteConfig";

const donationTiers = [
  { title: "$50", detail: "Helps cover practice ice and training supplies." },
  { title: "$150", detail: "Supports equipment and safety gear for veterans." },
  { title: "$500", detail: "Contributes to tournament travel and lodging costs." },
  { title: "$1,000+", detail: "Sustains major program operations and outreach." }
];

const impactAreas = [
  "Ice time and coaching",
  "Adaptive and replacement equipment",
  "Travel and tournament participation",
  "Community events and veteran outreach"
];

export default function DonatePage() {
  const externalDonate = siteConfig.publicSite.links.donate;

  return (
    <section className="stack">
      <article className="card donate-hero">
        <p className="eyebrow">Donate</p>
        <h1>Fund Veteran Healing Through Hockey</h1>
        <p className="hero-lead">
          Every contribution directly supports veterans in the Pittsburgh Warriors program through training,
          competition, and community.
        </p>
        <div className="mission-list">
          {impactAreas.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
        <div className="cta-row">
          <a className="button alt" href={externalDonate} target="_blank" rel="noreferrer">
            Donate Securely
          </a>
          <a className="button ghost" href="/partners">
            Sponsor Opportunities
          </a>
        </div>
      </article>

      <article className="card">
        <h2>Suggested Giving Levels</h2>
        <div className="about-card-grid">
          {donationTiers.map((tier) => (
            <article key={tier.title} className="event-card donate-tier">
              <h3>{tier.title}</h3>
              <p>{tier.detail}</p>
            </article>
          ))}
        </div>
      </article>

      <article className="card">
        <h2>Make A Lasting Impact</h2>
        <p>
          The Pittsburgh Warriors are a 501(c)(3) organization. Your support helps us keep this veteran-centered
          program available year-round.
        </p>
        <a className="button" href={externalDonate} target="_blank" rel="noreferrer">
          Give Now
        </a>
      </article>
    </section>
  );
}
