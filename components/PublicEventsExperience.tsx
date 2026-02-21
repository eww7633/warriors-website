"use client";

import { useEffect, useMemo, useState } from "react";

type EventCategory = "dvhl" | "national" | "hockey" | "off_ice";

type PublicEvent = {
  id: string;
  title: string;
  date: string;
  publicDetails: string;
  locationPublic?: string;
  locationPublicMapUrl?: string;
  eventTypeName?: string;
  eventUrl: string;
  category: EventCategory;
  heroImageUrl?: string;
  thumbnailImageUrl?: string;
  signupMode: "straight_rsvp" | "interest_gathering";
};

type Props = {
  events: PublicEvent[];
  hubCta: {
    href: string;
    label: string;
  };
};

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function parseDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function categoryLabel(category: EventCategory) {
  if (category === "dvhl") return "DVHL";
  if (category === "national") return "National Tournament";
  if (category === "hockey") return "Hockey Event";
  return "Off-Ice Event";
}

function monthLabel(monthDate: Date) {
  return monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function calendarDays(monthDate: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const firstDay = first.getDay();
  const start = new Date(first);
  start.setDate(first.getDate() - firstDay);

  const days: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
}

function mapEmbedUrl(location?: string, mapUrl?: string) {
  if (mapUrl && mapUrl.includes("/maps/embed")) {
    return mapUrl;
  }
  const query = location || mapUrl || "";
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function mapSearchUrl(location?: string, mapUrl?: string) {
  if (mapUrl) return mapUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location || "")}`;
}

function toGoogleDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(".000", "");
}

function googleCalendarUrl(event: PublicEvent) {
  const start = parseDate(event.date);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
    details: event.publicDetails,
    location: event.locationPublic || ""
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function outlookCalendarUrl(event: PublicEvent) {
  const start = parseDate(event.date).toISOString();
  const endDate = new Date(parseDate(event.date));
  endDate.setHours(endDate.getHours() + 2);
  const end = endDate.toISOString();
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: start,
    enddt: end,
    body: event.publicDetails,
    location: event.locationPublic || ""
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export default function PublicEventsExperience({ events, hubCta }: Props) {
  const sorted = useMemo(
    () => [...events].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()),
    [events]
  );
  const firstEventDate = sorted[0] ? parseDate(sorted[0].date) : new Date();
  const [monthCursor, setMonthCursor] = useState(
    new Date(firstEventDate.getFullYear(), firstEventDate.getMonth(), 1)
  );
  const [selectedId, setSelectedId] = useState(sorted[0]?.id || "");
  const [modalOpen, setModalOpen] = useState(false);

  const byDay = useMemo(() => {
    const map: Record<string, PublicEvent[]> = {};
    for (const event of sorted) {
      const key = dayKey(parseDate(event.date));
      map[key] ??= [];
      map[key].push(event);
    }
    return map;
  }, [sorted]);

  const selectedEvent = sorted.find((event) => event.id === selectedId) || sorted[0] || null;
  const days = calendarDays(monthCursor);
  const [shareStatus, setShareStatus] = useState("");
  const weekEnd = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const upcomingWeek = sorted.filter((event) => {
    const ts = parseDate(event.date).getTime();
    return ts >= Date.now() && ts <= weekEnd;
  });

  const runShare = async (event: PublicEvent) => {
    const payload = {
      title: event.title,
      text: `${event.title} - Pittsburgh Warriors Hockey Club`,
      url: event.eventUrl
    };

    try {
      if (typeof window !== "undefined" && navigator.share) {
        await navigator.share(payload);
        setShareStatus("Shared.");
        return;
      }
      if (typeof window !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(event.eventUrl);
        setShareStatus("Event link copied.");
      }
    } catch {
      setShareStatus("Unable to share right now.");
    }
  };

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  return (
    <section className="events-experience stack">
      <article className="card">
        <div className="section-heading">
          <h3>Upcoming This Week</h3>
          <a href="/calendar">View full HQ calendar</a>
        </div>
        {upcomingWeek.length === 0 ? (
          <p className="muted">No events in the next 7 days.</p>
        ) : (
          <div className="about-card-grid">
            {upcomingWeek.map((event) => (
              <article key={`${event.id}-week`} className="event-card stack">
                {event.thumbnailImageUrl ? (
                  <img src={event.thumbnailImageUrl} alt={event.title} loading="lazy" />
                ) : null}
                <strong>{event.title}</strong>
                <p className="muted">{parseDate(event.date).toLocaleString()}</p>
                <p className={`events-type-pill ${event.category}`}>{categoryLabel(event.category)}</p>
                <a className="button ghost" href={hubCta.href}>
                  {event.signupMode === "interest_gathering" ? "Submit Interest" : hubCta.label}
                </a>
              </article>
            ))}
          </div>
        )}
      </article>

      <article className="card events-calendar-card">
        <div className="events-calendar-top">
          <h2>Community Calendar</h2>
          <div className="events-month-controls">
            <button
              type="button"
              className="button ghost"
              onClick={() =>
                setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))
              }
            >
              Prev
            </button>
            <strong>{monthLabel(monthCursor)}</strong>
            <button
              type="button"
              className="button ghost"
              onClick={() =>
                setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))
              }
            >
              Next
            </button>
          </div>
        </div>

        <div className="events-legend">
          <span className="legend-item dvhl">DVHL</span>
          <span className="legend-item national">National Tournaments</span>
          <span className="legend-item hockey">Other Hockey</span>
          <span className="legend-item off_ice">Off-Ice</span>
        </div>

        <div className="events-grid-head">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="events-grid-days">
          {days.map((day) => {
            const key = dayKey(day);
            const dayEvents = byDay[key] || [];
            const inMonth = day.getMonth() === monthCursor.getMonth();
            return (
              <article key={key} className={`events-day ${inMonth ? "" : "outside"}`}>
                <p className="events-day-number">{day.getDate()}</p>
                <div className="events-day-list">
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      className={`events-chip ${event.category} ${selectedEvent?.id === event.id ? "active" : ""}`}
                      onClick={() => {
                        setSelectedId(event.id);
                        setModalOpen(true);
                      }}
                    >
                      {event.title}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </article>

      {sorted.length === 0 ? (
        <article className="card">
          <p className="muted">No events are currently scheduled.</p>
        </article>
      ) : null}

      {selectedEvent && modalOpen ? (
        <div className="events-modal-backdrop" role="presentation" onClick={() => setModalOpen(false)}>
          <article className="card events-feature-card events-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="events-feature-header">
              <p className={`events-type-pill ${selectedEvent.category}`}>
                {categoryLabel(selectedEvent.category)}
              </p>
              <div className="cta-row">
                <p className="muted">{parseDate(selectedEvent.date).toLocaleString()}</p>
                <button className="button ghost" type="button" onClick={() => setModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
            <h3>{selectedEvent.title}</h3>
            {selectedEvent.heroImageUrl ? (
              <img src={selectedEvent.heroImageUrl} alt={selectedEvent.title} className="event-feature-image" loading="lazy" />
            ) : null}
            <p>{selectedEvent.publicDetails}</p>
            {selectedEvent.locationPublic ? <p><strong>Location:</strong> {selectedEvent.locationPublic}</p> : null}

            <iframe
              title={`Map for ${selectedEvent.title}`}
              loading="lazy"
              className="event-map"
              src={mapEmbedUrl(selectedEvent.locationPublic, selectedEvent.locationPublicMapUrl)}
            />

            <div className="cta-row">
              <a className="button" href={hubCta.href}>
                {selectedEvent.signupMode === "interest_gathering" ? "Submit Interest in HQ" : hubCta.label}
              </a>
              <a className="button ghost" href={mapSearchUrl(selectedEvent.locationPublic, selectedEvent.locationPublicMapUrl)} target="_blank" rel="noreferrer">
                Open Map
              </a>
              <a className="button ghost" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(selectedEvent.eventUrl)}`} target="_blank" rel="noreferrer">
                Share on Facebook
              </a>
              <a className="button ghost" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(selectedEvent.title)}&url=${encodeURIComponent(selectedEvent.eventUrl)}`} target="_blank" rel="noreferrer">
                Share on X
              </a>
              <button className="button ghost" type="button" onClick={() => runShare(selectedEvent)}>
                Share / Copy Link
              </button>
            </div>
            {shareStatus ? <p className="muted">{shareStatus}</p> : null}
            <div className="cta-row">
              <a className="button alt" href={googleCalendarUrl(selectedEvent)} target="_blank" rel="noreferrer">
                Add to Google Calendar
              </a>
              <a className="button ghost" href={outlookCalendarUrl(selectedEvent)} target="_blank" rel="noreferrer">
                Add to Outlook
              </a>
              <a className="button" href={`/api/public/events/${encodeURIComponent(selectedEvent.id)}/ics`}>
                Download iCal (.ics)
              </a>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
