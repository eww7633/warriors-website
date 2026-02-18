import { news } from "@/lib/mockData";

export default function NewsPage() {
  return (
    <section className="card">
      <h2>Warriors News</h2>
      <div className="stack">
        {news.map((item) => (
          <article key={item.id} className="event-card">
            <h3>{item.title}</h3>
            <p>{new Date(item.date).toLocaleDateString()}</p>
            <p>{item.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
