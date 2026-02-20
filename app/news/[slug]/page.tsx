import Link from "next/link";
import { notFound } from "next/navigation";
import { getNewsPostBySlug } from "@/lib/hq/news";

export const dynamic = "force-dynamic";

export default async function NewsDetailPage({ params }: { params: { slug: string } }) {
  const post = await getNewsPostBySlug(params.slug);
  if (!post || !post.published) {
    notFound();
  }

  return (
    <section className="stack">
      <article className="card stack">
        <p className="kicker">{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</p>
        <h1>{post.title}</h1>
        <p className="hero-lead">{post.summary}</p>
        {post.coverImageUrl ? <img src={post.coverImageUrl} alt={post.title} loading="lazy" /> : null}
        {post.videoUrl ? (
          <p>
            <a href={post.videoUrl} target="_blank" rel="noreferrer">
              Watch related video
            </a>
          </p>
        ) : null}
        <article>
          {post.body.split(/\n\n+/).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>
        {post.galleryImageUrls.length > 0 ? (
          <div className="photo-grid">
            {post.galleryImageUrls.map((url) => (
              <a key={url} className="photo-card" href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={post.title} loading="lazy" />
              </a>
            ))}
          </div>
        ) : null}
        <div className="cta-row">
          <Link className="button ghost" href="/news">
            Back to News
          </Link>
        </div>
      </article>
    </section>
  );
}
