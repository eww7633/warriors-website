import Link from "next/link";
import { siteConfig } from "@/lib/siteConfig";
import { getHomepageShowcasePhotos } from "@/lib/showcase-photos";
import { getCurrentUser } from "@/lib/hq/session";
import { getAllEvents } from "@/lib/hq/events";
import { listLiveGames } from "@/lib/hq/live-games";
import { listPublishedNewsPosts } from "@/lib/hq/news";
import { getHomepageSocialPosts } from "@/lib/social-feed";
import GameScoreCard from "@/components/GameScoreCard";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))
  ]);
}

export default async function HomePage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  const donateUrl = "/donate";
  const query = searchParams ?? {};
  const [showcaseResult, userResult, eventsResult, gamesResult, newsResult, socialResult] = await Promise.allSettled([
    withTimeout(getHomepageShowcasePhotos(12), 1800),
    withTimeout(getCurrentUser(), 1200),
    withTimeout(getAllEvents(), 1800),
    withTimeout(listLiveGames(), 1800),
    withTimeout(listPublishedNewsPosts(3), 1800),
    withTimeout(getHomepageSocialPosts(), 1800)
  ]);
  const showcase = showcaseResult.status === "fulfilled" ? showcaseResult.value : [];
  const user = userResult.status === "fulfilled" ? userResult.value : null;
  const events = eventsResult.status === "fulfilled" ? eventsResult.value : [];
  const games = gamesResult.status === "fulfilled" ? gamesResult.value : [];
  const newsPosts = newsResult.status === "fulfilled" ? newsResult.value : [];
  const socialPosts = socialResult.status === "fulfilled" ? socialResult.value : [];
  const featuredGames = games.slice(0, 3);
  const now = Date.now();
  const upcomingEvents = events
    .filter((event) => new Date(event.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);
  const featuredVideoSources = [
    process.env.NEXT_PUBLIC_HOME_VIDEO_1,
    process.env.NEXT_PUBLIC_HOME_VIDEO_2
  ]
    .filter(Boolean)
    .map((value) => value!.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((url) => {
      try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, "");
        if (host === "youtube.com" || host === "m.youtube.com") {
          const id =
            parsed.searchParams.get("v") ||
            parsed.pathname.split("/").filter(Boolean)[1] ||
            parsed.pathname.split("/").filter(Boolean)[0];
          return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
        }
        if (host === "youtu.be") {
          const id = parsed.pathname.split("/").filter(Boolean)[0];
          return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
        }
        if (host === "vimeo.com") {
          const id = parsed.pathname.split("/").filter(Boolean)[0];
          return id ? `https://player.vimeo.com/video/${id}` : null;
        }
        return null;
      } catch {
        return null;
      }
    })
    .filter((value): value is string => Boolean(value));

  const leadPhoto = showcase[0] ?? null;
  const photoGrid = showcase.slice(1, 9);
  const nextPublicEvent = upcomingEvents[0];
  const nextEventLabel = nextPublicEvent ? new Date(nextPublicEvent.date).toLocaleString() : "No upcoming events";
  const signedInSummary = user ? `${user.fullName} | ${user.role === "admin" ? "Hockey Ops" : "Player"}` : null;
  const heroPhoto = leadPhoto ?? showcase[1] ?? null;
  const storyPhotos = showcase.slice(2, 5);
  const galleryPhotos = showcase.slice(5, 14);
  const impactStats = [
    { label: "Upcoming Public Events", value: String(upcomingEvents.length || 0) },
    { label: "Live / Scheduled Games", value: String(games.length || 0) },
    { label: "Program News Updates", value: String(newsPosts.length || 0) },
    { label: "Next Event", value: nextPublicEvent ? new Date(nextPublicEvent.date).toLocaleDateString() : "TBD" }
  ];
  const impactPillars = [
    {
      title: "Healing Through Teamwork",
      detail:
        "Hockey rebuilds confidence, routine, and connection for veterans navigating life after service."
    },
    {
      title: "Community Beyond The Rink",
      detail:
        "Families, volunteers, and partners all play a role in keeping veterans supported year-round."
    },
    {
      title: "Visible Impact You Can Fund",
      detail: "Every contribution directly supports ice time, travel, equipment, and operations."
    }
  ];
  const storyCards = [
    {
      title: "From Isolation to Brotherhood",
      body: "Warrior events give veterans a consistent place to show up, contribute, and be part of a team again."
    },
    {
      title: "More Than Games",
      body: "Volunteer drives, family events, and outreach activities keep the mission active off the ice too."
    },
    {
      title: "Built For Long-Term Recovery",
      body: "The program is designed for sustained participation, leadership growth, and peer accountability."
    }
  ];

  const mediaFallbackActions = [
    { label: "Watch on Instagram", href: siteConfig.social.instagram },
    { label: "Watch on Facebook", href: siteConfig.social.facebook }
  ];

  const videoCards =
    featuredVideoSources.length > 0 ? (
      <div className="video-grid">
        {featuredVideoSources.map((src, index) => (
          <div className="video-card" key={src}>
            <iframe
              src={src}
              title={`Featured Warriors video ${index + 1}`}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ))}
      </div>
    ) : (
      <div className="video-fallback">
        <p className="muted">Add `NEXT_PUBLIC_HOME_VIDEO_1` and `NEXT_PUBLIC_HOME_VIDEO_2` to feature videos here.</p>
        <div className="cta-row">
          {mediaFallbackActions.map((action) => (
            <a key={action.label} className="button ghost" href={action.href} target="_blank" rel="noreferrer">
              {action.label}
            </a>
          ))}
        </div>
      </div>
    );

  return (
    <section className="home-shell home-shell-public">
      <article className="card public-hero">
        <div className="public-hero-content">
          <p className="eyebrow">Pittsburgh Warriors Hockey Club</p>
          <h1>Veterans Healing Through Hockey, Community, and Purpose.</h1>
          <p className="hero-lead">
            We help service-disabled veterans reconnect through hockey, leadership, and year-round community events.
            Your support keeps this mission on the ice.
          </p>
          <div className="cta-row">
            <a className="button alt" href={donateUrl}>
              Donate Now
            </a>
            <Link className="button ghost" href="/join">
              Join The Program
            </Link>
            <Link className="button" href="/events">
              Explore Events
            </Link>
          </div>
          <div className="public-hero-meta">
            <span>Next public event: {nextEventLabel}</span>
            {signedInSummary ? <span>Signed in: {signedInSummary}</span> : null}
          </div>
        </div>
        {heroPhoto ? (
          <a className="public-hero-media" href={heroPhoto.viewUrl} target="_blank" rel="noreferrer">
            <img src={heroPhoto.imageUrl} alt="Pittsburgh Warriors in action" loading="lazy" />
          </a>
        ) : null}
      </article>

      <article className="card public-impact">
        <div className="section-heading">
          <h3>Why This Work Matters</h3>
          <a href={donateUrl}>Support the mission</a>
        </div>
        <div className="impact-grid">
          {impactPillars.map((pillar) => (
            <article key={pillar.title} className="event-card">
              <h4>{pillar.title}</h4>
              <p>{pillar.detail}</p>
            </article>
          ))}
        </div>
        <div className="impact-stat-grid">
          {impactStats.map((stat) => (
            <div key={stat.label} className="hero-stat">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="card media-panel">
        <div className="section-heading">
          <h3>Watch The Program In Action</h3>
          <a href={siteConfig.social.instagram} target="_blank" rel="noreferrer">
            More media
          </a>
        </div>
        {videoCards}
      </article>

      <article className="card public-stories">
        <div className="section-heading">
          <h3>What Veterans Tell Us</h3>
          <a href="/about">About the program</a>
        </div>
        <div className="impact-grid">
          {storyCards.map((story, index) => (
            <article key={story.title} className="event-card story-card">
              {storyPhotos[index] ? (
                <a href={storyPhotos[index].viewUrl} target="_blank" rel="noreferrer" className="story-photo">
                  <img src={storyPhotos[index].imageUrl} alt={story.title} loading="lazy" />
                </a>
              ) : null}
              <h4>{story.title}</h4>
              <p>{story.body}</p>
            </article>
          ))}
        </div>
      </article>

      <article className="card home-gallery">
        <div className="section-heading">
          <h3>Photo Journal</h3>
          <a href={siteConfig.social.instagram} target="_blank" rel="noreferrer">
            Follow on Instagram
          </a>
        </div>
        {leadPhoto ? (
          <a href={leadPhoto.viewUrl} target="_blank" rel="noreferrer" className="photo-spotlight">
            <img src={leadPhoto.imageUrl} alt="Warriors spotlight photo" loading="lazy" />
            <span>See full gallery</span>
          </a>
        ) : null}
        <div className="photo-grid">
          {(galleryPhotos.length > 0 ? galleryPhotos : photoGrid).map((photo) => (
            <a key={photo.id} href={photo.viewUrl} target="_blank" rel="noreferrer" className="photo-card">
              <img src={photo.imageUrl} alt="Warriors action photo" loading="lazy" />
            </a>
          ))}
        </div>
      </article>

      <article className="card home-news" id="news">
        <div className="section-heading">
          <h3>Program News</h3>
          <a href={siteConfig.social.facebook} target="_blank" rel="noreferrer">
            Follow updates
          </a>
        </div>
        <div className="about-card-grid">
          {newsPosts.length > 0 ? (
            newsPosts.map((item) => (
              <article key={item.id} className="event-card">
                <p className="kicker">
                  {new Date(item.publishedAt || item.createdAt).toLocaleDateString()}
                </p>
                <h4>{item.title}</h4>
                <p>{item.summary}</p>
                <p>
                  <Link href={`/news/${item.slug}`}>Read story</Link>
                </p>
              </article>
            ))
          ) : (
            <p className="muted">No published news yet. Hockey Ops can publish stories in Admin News.</p>
          )}
        </div>
      </article>

      <article className="card home-news">
        <div className="section-heading">
          <h3>Latest Social Highlights</h3>
          <a href={siteConfig.social.instagram} target="_blank" rel="noreferrer">
            Open socials
          </a>
        </div>
        <div className="about-card-grid">
          {socialPosts.length > 0 ? (
            socialPosts.map((post) => (
              <article key={`${post.platform}-${post.id}`} className="event-card">
                <p className="kicker">{post.platform === "instagram" ? "Instagram" : "Facebook"}</p>
                {post.imageUrl ? <img src={post.imageUrl} alt={`${post.platform} update`} loading="lazy" /> : null}
                <p>{post.text || "New post available."}</p>
                <p>
                  <a href={post.permalink} target="_blank" rel="noreferrer">Open post</a>
                </p>
              </article>
            ))
          ) : (
            <p className="muted">
              Connect Meta Business API credentials to display live Instagram/Facebook posts.
            </p>
          )}
        </div>
      </article>

      <article className="card sleek-events">
        <div className="section-heading">
          <h3>Upcoming Events</h3>
          <a href="/events">Full schedule</a>
        </div>
        <div className="stack">
          {upcomingEvents.map((event) => (
            <div key={event.id} className="event-card">
              <div className="event-top">
                <strong>{event.title}</strong>
                <span className="event-date-chip">
                  {new Date(event.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
              <p>{new Date(event.date).toLocaleString()}</p>
              {event.locationPublic ? <p>{event.locationPublic}</p> : null}
              <p>
                <Link href={`/calendar?event=${encodeURIComponent(event.id)}`}>
                  Open event details
                </Link>
              </p>
            </div>
          ))}
          {upcomingEvents.length === 0 ? <p className="muted">No upcoming events scheduled yet.</p> : null}
        </div>
      </article>

      <article className="card game-center-panel">
        <div className="section-heading">
          <h3>Game Center</h3>
          <a href="/games">Live scoreboard</a>
        </div>
        <div className="game-center-grid">
          {featuredGames.map((game) => (
            <GameScoreCard
              key={game.id}
              gameId={game.id}
              startsAt={game.startsAt}
              location={game.location}
              liveStatus={game.liveStatus}
              competitionTitle={game.competitionTitle}
              homeTeamName={game.teamName}
              awayTeamName={game.opponent || "Opponent"}
              homeScore={game.warriorsScore}
              awayScore={game.opponentScore}
              period={game.period}
              clock={game.clock}
              showManageLink
            />
          ))}
          {featuredGames.length === 0 ? (
            <p className="muted">No games scheduled yet. Hockey Ops can create games in the competitions panel.</p>
          ) : null}
        </div>
      </article>

      <article className="card public-final-cta">
        <h3>Help Keep Veterans On The Ice</h3>
        <p>
          Donations fund direct program costs: ice time, travel, adaptive equipment, and operations that keep this
          community active all season.
        </p>
        <div className="cta-row">
          <a className="button alt" href={donateUrl}>
            Donate to the Program
          </a>
          <a className="button ghost" href={siteConfig.social.facebook} target="_blank" rel="noreferrer">
            Follow Program Updates
          </a>
          {user ? (
            <Link className="button" href={user.role === "admin" ? "/admin" : "/player"}>
              Open Warrior HQ
            </Link>
          ) : (
            <Link className="button" href="/login">
              Player Log In
            </Link>
          )}
        </div>
        {query.error ? <p className="muted">{query.error.replaceAll("_", " ")}</p> : null}
      </article>
    </section>
  );
}
