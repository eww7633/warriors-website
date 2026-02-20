import { getPublicPublishedEvents } from "@/lib/hq/events";
import PublicEventsExperience from "@/components/PublicEventsExperience";
import { getEventSignupConfigMap } from "@/lib/hq/event-signups";

export const dynamic = "force-dynamic";

type EventCategory = "dvhl" | "national" | "hockey" | "off_ice";

function classifyEventCategory(event: {
  title: string;
  publicDetails: string;
  eventTypeName?: string;
}): EventCategory {
  const haystack = `${event.title} ${event.publicDetails} ${event.eventTypeName || ""}`.toLowerCase();
  if (haystack.includes("dvhl")) return "dvhl";
  if (
    haystack.includes("tournament") ||
    haystack.includes("classic") ||
    haystack.includes("nationals") ||
    haystack.includes("national")
  ) {
    return "national";
  }
  if (
    haystack.includes("hockey") ||
    haystack.includes("practice") ||
    haystack.includes("game") ||
    haystack.includes("scrimmage") ||
    haystack.includes("on-ice")
  ) {
    return "hockey";
  }
  return "off_ice";
}

export default async function EventsPage() {
  const events = await getPublicPublishedEvents();
  const signupConfigByEvent = await getEventSignupConfigMap(events.map((event) => event.id));
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pghwarriorhockey.us";
  const upcoming = events
    .filter((event) => new Date(event.date).getTime() >= Date.now())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((event) => ({
      ...event,
      category: classifyEventCategory(event),
      eventUrl: `${baseUrl}/events?event=${encodeURIComponent(event.id)}`,
      heroImageUrl: signupConfigByEvent[event.id]?.heroImageUrl,
      thumbnailImageUrl: signupConfigByEvent[event.id]?.thumbnailImageUrl
    }));

  return (
    <section className="stack">
      <article className="card events-hero-card">
        <p className="eyebrow">Events</p>
        <h1>Upcoming Public Events</h1>
        <p className="hero-lead">
          Explore a live community calendar with color-coded event types, detailed venue maps, and one-click add-to-calendar tools.
        </p>
        <div className="events-hero-bands">
          <span className="band dvhl">DVHL</span>
          <span className="band national">National Tournaments</span>
          <span className="band hockey">Other Hockey</span>
          <span className="band off_ice">Off-Ice</span>
        </div>
      </article>

      {upcoming.length > 0 ? (
        <PublicEventsExperience events={upcoming} />
      ) : (
        <article className="card">
          <p className="muted">No upcoming public events are posted yet.</p>
        </article>
      )}
    </section>
  );
}
