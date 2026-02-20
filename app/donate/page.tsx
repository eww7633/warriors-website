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

export default function DonatePage({
  searchParams
}: {
  searchParams?: { sent?: string; error?: string; checkout?: string };
}) {
  const sent = searchParams?.sent === "1";
  const error = Boolean(searchParams?.error);
  const checkout = searchParams?.checkout;
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
        <h2>Donate Online</h2>
        <p>
          Secure checkout is available here. If Stripe is not configured yet, use the external donate link.
        </p>
        {checkout === "success" ? <p className="badge">Donation completed. Thank you for your support.</p> : null}
        {checkout === "cancelled" ? <p className="muted">Checkout was cancelled.</p> : null}
        <form className="grid-form" action="/api/public/donations/checkout" method="post">
          <input name="fullName" placeholder="Full name" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="amountUsd" type="number" min={1} step="0.01" placeholder="Amount (USD)" required />
          <label>
            Frequency
            <select name="frequency" defaultValue="one_time">
              <option value="one_time">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </label>
          <input name="message" placeholder="Dedication / note (optional)" />
          <button className="button alt" type="submit">Checkout with Stripe</button>
        </form>
        <a className="button ghost" href={externalDonate} target="_blank" rel="noreferrer">
          Use External Donate Link
        </a>
      </article>

      <article className="card">
        <h2>Donation Contact Request</h2>
        <p className="muted">
          Use this if you want us to contact you directly for sponsorship, recurring giving, or large gifts.
        </p>
        {sent ? <p className="badge">Thanks. Hockey Ops received your donation request.</p> : null}
        {error ? <p className="muted">Unable to submit donation request. Please try again.</p> : null}
        <form className="grid-form" action="/api/public/donations" method="post">
          <input name="fullName" placeholder="Full name" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="amountUsd" type="number" min={1} step="0.01" placeholder="Amount (optional)" />
          <label>
            Frequency
            <select name="frequency" defaultValue="one_time">
              <option value="one_time">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </label>
          <input name="message" placeholder="Message (optional)" />
          <button className="button alt" type="submit">Send Donation Request</button>
        </form>
      </article>
    </section>
  );
}
