const guidingPrinciples = [
  "Honorably discharged veterans with service-connected disabilities are eligible to register.",
  "No prior hockey experience is required.",
  "Every participating player must be under VA care.",
  "Medical release from your care team is required before on-ice participation.",
  "A valid USA Hockey number is required each season."
];

const services = [
  "Learn to Play clinics for veterans new to hockey",
  "Adaptive and standard equipment access",
  "Weekly practices and game participation",
  "National tournament travel opportunities",
  "Off-ice veteran and family community events"
];

export default function AboutPage() {
  return (
    <>
      <article className="card about-grid">
        <div>
          <p className="eyebrow">Mission</p>
          <h2>Healing Through Hockey</h2>
          <p>
            Pittsburgh Warriors Hockey is a 501(c)(3) non-profit serving honorably discharged U.S. military veterans
            with service-connected disabilities. We use hockey as a catalyst for physical rehabilitation, mental
            wellness, and lasting camaraderie.
          </p>
          <p>
            The program is built for veterans who are ready to recover through team competition, structure, and
            community.
          </p>
        </div>
        <div>
          <p className="eyebrow">Vision</p>
          <h2>Built For Long-Term Impact</h2>
          <p>
            Community support funds ice time, equipment, travel, and year-round operations that keep veteran athletes
            in the game and connected to one another.
          </p>
          <a className="button alt" href="/donate">
            Support The Mission
          </a>
        </div>
      </article>

      <article className="card about-grid">
        <div>
          <h3>Registration Criteria</h3>
          <ul className="about-list">
            {guidingPrinciples.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Program Services</h3>
          <ul className="about-list">
            {services.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </article>

      <article className="card">
        <h3>Program Notes</h3>
        <ul className="about-list">
          <li>Players who are 100% disabled can access a reduced USA Hockey registration fee through USA Hockey's disabled athlete program.</li>
          <li>Caregivers may assist with registration and onboarding when needed.</li>
          <li>Questions about eligibility or onboarding can be sent to Hockey Ops via the Contact page.</li>
        </ul>
      </article>
    </>
  );
}
