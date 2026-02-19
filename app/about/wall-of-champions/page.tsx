const champions = [
  {
    year: "2025",
    location: "Coral Springs, FL",
    title: "Warrior Nationals",
    captains: "C: Evan Wawrykow | A: Keith Constantino | A: Nick Boyko"
  },
  {
    year: "2024",
    location: "Hendrickson, MN",
    title: "Hendrickson Tournament",
    captains: "C: Dan Howe | A: Quinn McGrath | A: Evan Wawrykow"
  },
  {
    year: "2023",
    location: "St. Louis, MO",
    title: "National Tournament",
    captains: "C: Dwayne Hinkle | A: Sam Johnson | A: Steve Festa"
  },
  {
    year: "2022",
    location: "Detroit, MI",
    title: "National Tournament",
    captains: "C: Garret Kurtz | A: Sean O'Rourke | A: Evan Wawrykow"
  }
];

export default function WallOfChampionsPage() {
  return (
    <article className="card">
      <p className="eyebrow">Wall Of Champions</p>
      <h2>Competitive Legacy</h2>
      <p className="muted">
        Tournament history honoring Warriors teams and veteran leaders who represented the program with excellence.
      </p>
      <div className="about-card-grid">
        {champions.map((entry) => (
          <article key={entry.year} className="event-card champion-card">
            <p className="kicker">{entry.year}</p>
            <h3>{entry.title}</h3>
            <p>{entry.location}</p>
            <p className="muted">{entry.captains}</p>
          </article>
        ))}
      </div>
    </article>
  );
}
