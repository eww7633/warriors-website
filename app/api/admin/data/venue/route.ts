import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { createVenue } from "@/lib/hq/ops-data";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const name = String(formData.get("name") ?? "").trim();
  const address1 = String(formData.get("address1") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();
  const mapUrl = String(formData.get("mapUrl") ?? "").trim();

  if (!name) {
    return NextResponse.redirect(new URL("/admin?section=sportsdata&error=venue_name_required", request.url), 303);
  }

  try {
    await createVenue({
      name,
      address1: address1 || undefined,
      city: city || undefined,
      state: state || undefined,
      postalCode: postalCode || undefined,
      mapUrl: mapUrl || undefined
    });
    return NextResponse.redirect(new URL("/admin?section=sportsdata&data=venue_created", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=sportsdata&error=venue_create_failed", request.url), 303);
  }
}
