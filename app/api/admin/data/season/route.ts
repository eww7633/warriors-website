import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { createSeason } from "@/lib/hq/ops-data";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const label = String(formData.get("label") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "").trim();
  const endsAt = String(formData.get("endsAt") ?? "").trim();
  const isActive = String(formData.get("isActive") ?? "").trim() === "on";
  const isArchived = String(formData.get("isArchived") ?? "").trim() === "on";

  if (!label) {
    return NextResponse.redirect(new URL("/admin?section=sportsdata&error=season_label_required", request.url), 303);
  }

  try {
    await createSeason({
      label,
      startsAt: startsAt || undefined,
      endsAt: endsAt || undefined,
      isActive,
      isArchived
    });
    return NextResponse.redirect(new URL("/admin?section=sportsdata&data=season_created", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=sportsdata&error=season_create_failed", request.url), 303);
  }
}
