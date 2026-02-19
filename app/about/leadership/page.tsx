const leadership = [
  {
    name: "Program Director",
    role: "Operations & Partnerships",
    summary: "Leads strategic planning, sponsor relationships, and veteran outreach initiatives."
  },
  {
    name: "Head Coach",
    role: "Player Development",
    summary: "Builds inclusive training sessions, competitive readiness, and on-ice leadership culture."
  },
  {
    name: "Assistant Coaches",
    role: "Systems & Mentorship",
    summary: "Support skill progression and ensure every athlete has clear growth pathways."
  },
  {
    name: "Team Captains",
    role: "Culture & Accountability",
    summary: "Represent player voice, strengthen brotherhood, and model team standards."
  }
];

export default function LeadershipPage() {
  return (
    <article className="card">
      <p className="eyebrow">Leadership</p>
      <h2>Program Leadership</h2>
      <p className="muted">
        Veteran-first leadership focused on safety, growth, and high-integrity competition.
      </p>
      <div className="about-card-grid">
        {leadership.map((member) => (
          <article key={member.name} className="event-card">
            <h3>{member.name}</h3>
            <p className="kicker">{member.role}</p>
            <p>{member.summary}</p>
          </article>
        ))}
      </div>
    </article>
  );
}
