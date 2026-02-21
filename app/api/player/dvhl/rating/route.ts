import { NextResponse } from "next/server";
import { upsertDvhlSkillRating } from "@/lib/hq/dvhl-skill-ratings";
import { getCurrentUser } from "@/lib/hq/session";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "player" && user.role !== "admin") || user.status !== "approved") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const rating = Number(String(formData.get("rating") ?? "").trim());
  const position = String(formData.get("position") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const returnToRaw = String(formData.get("returnTo") ?? "/player/dvhl?tab=self_rating").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/player/dvhl?tab=self_rating";

  if (!Number.isFinite(rating) || rating < 0 || rating > 100) {
    const sep = returnTo.includes("?") ? "&" : "?";
    return NextResponse.redirect(new URL(`${returnTo}${sep}error=invalid_skill_rating`, request.url), 303);
  }

  try {
    await upsertDvhlSkillRating({
      userId: user.id,
      position,
      rating,
      notes
    });
    const sep = returnTo.includes("?") ? "&" : "?";
    return NextResponse.redirect(new URL(`${returnTo}${sep}dvhl=rating_saved`, request.url), 303);
  } catch {
    const sep = returnTo.includes("?") ? "&" : "?";
    return NextResponse.redirect(new URL(`${returnTo}${sep}error=dvhl_rating_save_failed`, request.url), 303);
  }
}
