import { getHomepageShowcasePhotos } from "@/lib/showcase-photos";

export const dynamic = "force-dynamic";

const gallerySections = [
  "Hendrickson Hockey Fest",
  "Battle Of The Branches",
  "Chief John Walsh Memorial",
  "Community Events"
];

export default async function GalleriesPage() {
  const photos = await getHomepageShowcasePhotos(24);

  return (
    <article className="card">
      <p className="eyebrow">Galleries</p>
      <h2>Program Photo Galleries</h2>
      <p className="muted">Season highlights from tournaments, practices, and veteran community events.</p>
      <div className="about-gallery-tags">
        {gallerySections.map((label) => (
          <span key={label} className="about-tag">
            {label}
          </span>
        ))}
      </div>
      <div className="photo-grid">
        {photos.map((photo) => (
          <a key={photo.id} href={photo.viewUrl} target="_blank" rel="noreferrer" className="photo-card">
            <img src={photo.imageUrl} alt="Warriors gallery" loading="lazy" />
          </a>
        ))}
      </div>
      {photos.length === 0 ? <p className="muted">No gallery images available yet.</p> : null}
    </article>
  );
}
