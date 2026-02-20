import Link from "next/link";
import { listPublishedNewsPosts } from "@/lib/hq/news";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const posts = await listPublishedNewsPosts();

  return (
    <section className="stack">
      <article className="card">
        <p className="eyebrow">Program News</p>
        <h1>Stories From The Warriors</h1>
        <p className="hero-lead">Updates, media, and impact highlights from the Pittsburgh Warriors community.</p>
      </article>

      <article className="card stack">
        {posts.length === 0 ? (
          <p className="muted">No published stories yet.</p>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="event-card stack">
              <p className="kicker">{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</p>
              <h3>{post.title}</h3>
              <p>{post.summary}</p>
              {post.coverImageUrl ? <img src={post.coverImageUrl} alt={post.title} loading="lazy" /> : null}
              <div className="cta-row">
                <Link className="button ghost" href={`/news/${post.slug}`}>
                  Read Story
                </Link>
              </div>
            </article>
          ))
        )}
      </article>
    </section>
  );
}
