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

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const events = await getPublicPublishedEvents();
  const event = events.find((entry) => entry.id === context.params.id);

  if (!event) {
    return new NextResponse("Event not found", { status: 404 });
  }

  const start = new Date(event.date);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);
  const now = new Date();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pittsburgh Warriors Hockey Club//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@pghwarriorhockey.us`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.publicDetails || "")}`,
    `LOCATION:${escapeIcs(event.locationPublic || "")}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ];

  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="warriors-event-${event.id}.ics"`
    }
  });
}
