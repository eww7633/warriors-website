import { NextResponse } from "next/server";
import { getPublicPublishedEvents } from "@/lib/hq/events";

export async function GET() {
  const items = await getPublicPublishedEvents();
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    count: items.length,
    items: items.map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.date,
      publicDetails: event.publicDetails,
      location: event.locationPublic
    }))
  });
}
