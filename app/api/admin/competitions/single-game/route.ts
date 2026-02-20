import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { createSingleGame } from "@/lib/hq/competitions";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const title = String(formData.get("title") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const rosterMode = String(formData.get("rosterMode") ?? "mixed").trim();
  const teamName = String(formData.get("teamName") ?? "Single Game Squad").trim();

  if (!title) {
    return NextResponse.redirect(new URL("/admin?section=competitions&error=missing_single_game_title", request.url), 303);
  }

  if (!["gold", "black", "mixed"].includes(rosterMode)) {
    return NextResponse.redirect(new URL("/admin?section=competitions&error=invalid_single_game_mode", request.url), 303);
  }

  try {
    await createSingleGame({
      title,
      startsAt,
      notes,
      teamName,
      rosterMode: rosterMode as "gold" | "black" | "mixed"
    });
    return NextResponse.redirect(new URL("/admin?section=competitions&competition=created", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=competitions&error=single_game_create_failed", request.url), 303);
  }
}
