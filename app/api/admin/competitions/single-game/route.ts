import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { createSingleGame } from "@/lib/hq/competitions";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const rosterMode = String(formData.get("rosterMode") ?? "mixed").trim();
  const teamName = String(formData.get("teamName") ?? "Single Game Squad").trim();

  if (!title) {
    return NextResponse.redirect(new URL("/admin?error=missing_single_game_title", request.url), 303);
  }

  if (!["gold", "black", "mixed"].includes(rosterMode)) {
    return NextResponse.redirect(new URL("/admin?error=invalid_single_game_mode", request.url), 303);
  }

  try {
    await createSingleGame({
      title,
      startsAt,
      notes,
      teamName,
      rosterMode: rosterMode as "gold" | "black" | "mixed"
    });
    return NextResponse.redirect(new URL("/admin?competition=created", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?error=single_game_create_failed", request.url), 303);
  }
}
