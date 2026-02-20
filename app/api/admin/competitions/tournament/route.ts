import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { createTournament } from "@/lib/hq/competitions";

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

  const includeTeams = ["gold", "white", "black"].filter(
    (teamKey) => String(formData.get(teamKey) ?? "").trim() === "on"
  ) as ("gold" | "white" | "black")[];

  if (!title) {
    return NextResponse.redirect(new URL("/admin?section=competitions&error=missing_tournament_title", request.url), 303);
  }

  try {
    await createTournament({ title, startsAt, includeTeams, notes });
    return NextResponse.redirect(new URL("/admin?section=competitions&competition=created", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=competitions&error=tournament_create_failed", request.url), 303);
  }
}
