import { NextResponse } from "next/server";
import { getPublicPublishedEvents } from "@/lib/hq/events";

function escapeIcs(input: string) {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(".000", "");
}

export async function GET() {
  const now = new Date();
  const events = (await getPublicPublishedEvents())
    .filter((event) => {
      const startsAt = new Date(event.date);
      return !Number.isNaN(startsAt.getTime()) && startsAt.getTime() >= now.getTime() - 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pittsburgh Warriors Hockey Club//Public Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Pittsburgh Warriors Events",
    "X-WR-TIMEZONE:America/New_York"
  ];

  for (const event of events) {
    const start = new Date(event.date);
    const end = new Date(start);
    end.setHours(end.getHours() + 2);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@pghwarriorhockey.us`,
      `DTSTAMP:${toIcsDate(now)}`,
      `DTSTART:${toIcsDate(start)}`,
      `DTEND:${toIcsDate(end)}`,
      `SUMMARY:${escapeIcs(event.title)}`,
      `DESCRIPTION:${escapeIcs(event.publicDetails || "")}`,
      `LOCATION:${escapeIcs(event.locationPublic || "")}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="warriors-public-events.ics"',
      "Cache-Control": "public, max-age=300"
    }
  });
}
