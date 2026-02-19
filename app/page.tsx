import Link from "next/link";
import { siteConfig } from "@/lib/siteConfig";
import { news } from "@/lib/mockData";
import { getHomepageShowcasePhotos } from "@/lib/showcase-photos";
import { getCurrentUser } from "@/lib/hq/session";
import { getAllEvents } from "@/lib/hq/events";
import { listLiveGames } from "@/lib/hq/live-games";
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
  const [showcaseResult, userResult, eventsResult, gamesResult] = await Promise.allSettled([
    withTimeout(getHomepageShowcasePhotos(12), 1800),
    withTimeout(getCurrentUser(), 1200),
    withTimeout(getAllEvents(), 1800),
    withTimeout(listLiveGames(), 1800)
  ]);
  const showcase = showcaseResult.status === "fulfilled" ? showcaseResult.value : [];
  const user = userResult.status === "fulfilled" ? userResult.value : null;
  const events = eventsResult.status === "fulfilled" ? eventsResult.value : [];
  const games = gamesResult.status === "fulfilled" ? gamesResult.value : [];
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

  const signedInSummary = user
    ? `${user.fullName} | ${user.role === "admin" ? "Hockey Ops" : "Player"}`
    : null;

  const heroHighlights = [
    "Built for veterans and service-disabled athletes.",
    "Community-first program with year-round events.",
    "Every donation directly supports ice time, travel, and gear."
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
    <section className="home-shell">
      <article className="card hero-panel">
        <p className="eyebrow">Pittsburgh Warriors Hockey Club</p>
        <h1>Healing Through Hockey. Backed By Community.</h1>
        <p className="hero-lead">
          The Pittsburgh Warriors give veterans a place to compete, recover, and reconnect. Your support keeps this
          program on the ice.
        </p>
        <div className="hero-highlights">
          {heroHighlights.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
        <div className="hero-stat-row">
          <div className="hero-stat">
            <span>Upcoming events</span>
            <strong>{upcomingEvents.length}</strong>
          </div>
          <div className="hero-stat">
            <span>Next public event</span>
            <strong>{nextEventLabel}</strong>
          </div>
        </div>
        <div className="cta-row">
          <a className="button alt" href={donateUrl}>
            Donate to the Program
          </a>
          <a className="button ghost" href="/events">
            View Public Events
          </a>
          {user ? (
            <Link className="button" href={user.role === "admin" ? "/admin" : "/player"}>
              Open Warrior HQ
            </Link>
          ) : (
            <Link className="button" href="/login">
              Player Log in
            </Link>
          )}
        </div>
        {signedInSummary ? <p className="session-label">Signed in as {signedInSummary}</p> : null}
        {query.error ? <p className="muted">{query.error.replaceAll("_", " ")}</p> : null}
      </article>

      <article className="card mission-panel">
        <h3>Why Support The Warriors</h3>
        <p className="muted">
          Your support funds ice time, travel, equipment support, and the year-round operations that keep veterans in
          the game and connected to each other.
        </p>
        <div className="mission-list">
          <p>Programs designed for veterans and service-disabled athletes.</p>
          <p>Consistent practices, competitions, and community events.</p>
          <p>Direct impact you can see at every event.</p>
        </div>
        <a className="button alt" href={donateUrl}>
          Give Today
        </a>
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

      <article className="card home-gallery">
        <div className="section-heading">
          <h3>Warriors In Action</h3>
          <a href={siteConfig.social.instagram} target="_blank" rel="noreferrer">
            Follow on Instagram
          </a>
        </div>
        <p className="muted">Real moments from games, practices, and veteran community events.</p>
        {leadPhoto ? (
          <a href={leadPhoto.viewUrl} target="_blank" rel="noreferrer" className="photo-spotlight">
            <img src={leadPhoto.imageUrl} alt="Warriors spotlight photo" loading="lazy" />
            <span>See the full gallery</span>
          </a>
        ) : null}
        <div className="photo-grid">
          {photoGrid.map((photo) => (
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
          {news.map((item) => (
            <article key={item.id} className="event-card">
              <p className="kicker">{new Date(item.date).toLocaleDateString()}</p>
              <h4>{item.title}</h4>
              <p>{item.summary}</p>
            </article>
          ))}
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
    </section>
  );
}
