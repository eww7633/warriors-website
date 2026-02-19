import { NextResponse } from "next/server";
import { getPublicPublishedEvents } from "@/lib/hq/events";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hq.pghwarriorhockey.us";
  const items = await getPublicPublishedEvents();
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    count: items.length,
    items: items.map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.date,
      publicDetails: event.publicDetails,
      location: event.locationPublic,
      locationMapUrl: event.locationPublicMapUrl || null,
      eventType: event.eventTypeName || "General",
      eventUrl: `${baseUrl}/calendar?event=${encodeURIComponent(event.id)}`,
      loginUrl: `${baseUrl}/login`,
      registerUrl: `${baseUrl}/register`
    }))
  });
}
