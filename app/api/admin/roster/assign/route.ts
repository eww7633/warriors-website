import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { updateCentralRosterPlayer } from "@/lib/hq/roster";
import { upsertPlayerContactProfile } from "@/lib/hq/player-profiles";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const userId = String(formData.get("userId") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const rosterId = String(formData.get("rosterId") ?? "main-player-roster").trim() || "main-player-roster";
  const primarySubRoster = String(formData.get("primarySubRoster") ?? "").trim();
  const jerseyNumberRaw = String(formData.get("jerseyNumber") ?? "").trim();
  const activityStatus = String(formData.get("activityStatus") ?? "active").trim();
  const forceNumberOverlap = String(formData.get("forceNumberOverlap") ?? "").trim() === "on";
  const allowCrossColorJerseyOverlap =
    String(formData.get("allowCrossColorJerseyOverlap") ?? "").trim() === "on";

  const jerseyNumber = jerseyNumberRaw ? Number(jerseyNumberRaw) : undefined;

  if (!userId || !fullName || !["active", "inactive"].includes(activityStatus)) {
    return NextResponse.redirect(new URL("/admin/roster?error=invalid_roster_update", request.url), 303);
  }

  if (!["gold", "white", "black"].includes(primarySubRoster)) {
    return NextResponse.redirect(new URL("/admin/roster?error=primary_sub_roster_required", request.url), 303);
  }

  if (jerseyNumberRaw && (!Number.isFinite(jerseyNumber) || Number(jerseyNumber) <= 0 || Number(jerseyNumber) > 99)) {
    return NextResponse.redirect(new URL("/admin/roster?error=invalid_jersey_number", request.url), 303);
  }

  try {
    const result = await updateCentralRosterPlayer({
      userId,
      fullName,
      rosterId,
      jerseyNumber,
      activityStatus: activityStatus as "active" | "inactive",
      forceNumberOverlap
    });

    if (!result.ok) {
      return NextResponse.redirect(
        new URL(
          `/admin/roster?error=number_conflict&conflictPlayer=${encodeURIComponent(result.conflict.name)}`,
          request.url
        ),
        303
      );
    }

    await upsertPlayerContactProfile({
      userId,
      primarySubRoster: primarySubRoster as "gold" | "white" | "black",
      allowCrossColorJerseyOverlap
    });

    return NextResponse.redirect(new URL("/admin/roster?saved=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin/roster?error=roster_update_failed", request.url), 303);
  }
}
