const guidingPrinciples = [
  "Winning matters, but healing and brotherhood matter more.",
  "No previous hockey experience is required to join the program.",
  "Every player is respected as a teammate regardless of ability.",
  "We uphold professional conduct on and off the ice.",
  "We support each other as veterans, athletes, and families."
];

const services = [
  "Weekly ice access and skill development",
  "Adaptive equipment support when needed",
  "Regional and national tournament participation",
  "Family and community events",
  "Veteran-to-veteran support network"
];

export default function AboutPage() {
  return (
    <>
      <article className="card about-grid">
        <div>
          <p className="eyebrow">Mission</p>
          <h2>Healing Through Hockey</h2>
          <p>
            Pittsburgh Warriors Hockey is a 501(c)(3) organization of honorably discharged service members with
            service-connected disabilities. Our mission is to provide a cathartic, team-centered environment that
            promotes physical and mental recovery.
          </p>
          <p>
            We believe hockey can be a catalyst for long-term wellness, renewed identity, and lasting camaraderie.
          </p>
        </div>
        <div>
          <p className="eyebrow">Vision</p>
          <h2>Built For Long-Term Impact</h2>
          <p>
            With support from the community, we use hockey to create a culture of healing for veterans in perpetuity.
            Donations directly fund ice time, equipment, travel, and program operations.
          </p>
          <a className="button alt" href="/donate">
            Support The Mission
          </a>
        </div>
      </article>

      <article className="card about-grid">
        <div>
          <h3>Guiding Principles</h3>
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
    </>
  );
}
