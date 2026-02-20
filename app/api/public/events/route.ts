import { NextResponse } from "next/server";
import { getPublicPublishedEvents } from "@/lib/hq/events";
import { getEventSignupConfigMap } from "@/lib/hq/event-signups";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pghwarriorhockey.us";
  const items = await getPublicPublishedEvents();
  const signupConfigs = await getEventSignupConfigMap(items.map((event) => event.id));
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
      heroImageUrl: signupConfigs[event.id]?.heroImageUrl || null,
      thumbnailImageUrl: signupConfigs[event.id]?.thumbnailImageUrl || null,
      eventUrl: `${baseUrl}/calendar?event=${encodeURIComponent(event.id)}`,
      loginUrl: `${baseUrl}/login`,
      registerUrl: `${baseUrl}/join`
    }))
  });
}
