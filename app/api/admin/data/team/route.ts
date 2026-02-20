import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { createTeam } from "@/lib/hq/ops-data";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !canAccessAdminPanel(actor)) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const colorTag = String(formData.get("colorTag") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim();
  const seasonId = String(formData.get("seasonId") ?? "").trim();
  const isActive = String(formData.get("isActive") ?? "").trim() === "on";

  if (!name) {
    return NextResponse.redirect(new URL("/admin?section=sportsdata&error=team_name_required", request.url), 303);
  }

  try {
    await createTeam({
      name,
      code: code || undefined,
      colorTag: colorTag || undefined,
      level: level || undefined,
      seasonId: seasonId || undefined,
      isActive
    });
    return NextResponse.redirect(new URL("/admin?section=sportsdata&data=team_created", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=sportsdata&error=team_create_failed", request.url), 303);
  }
}
