import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { updateCentralRosterPlayer } from "@/lib/hq/roster";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const userId = String(formData.get("userId") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const rosterId = String(formData.get("rosterId") ?? "").trim();
  const jerseyNumberRaw = String(formData.get("jerseyNumber") ?? "").trim();
  const activityStatus = String(formData.get("activityStatus") ?? "active").trim();
  const forceNumberOverlap = String(formData.get("forceNumberOverlap") ?? "").trim() === "on";

  const jerseyNumber = jerseyNumberRaw ? Number(jerseyNumberRaw) : undefined;

  if (!userId || !fullName || !["active", "inactive"].includes(activityStatus)) {
    return NextResponse.redirect(new URL("/admin/roster?error=invalid_roster_update", request.url), 303);
  }

  if (jerseyNumberRaw && (!Number.isFinite(jerseyNumber) || Number(jerseyNumber) <= 0 || Number(jerseyNumber) > 99)) {
    return NextResponse.redirect(new URL("/admin/roster?error=invalid_jersey_number", request.url), 303);
  }

  try {
    const result = await updateCentralRosterPlayer({
      userId,
      fullName,
      rosterId: rosterId || undefined,
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

    return NextResponse.redirect(new URL("/admin/roster?saved=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin/roster?error=roster_update_failed", request.url), 303);
  }
}
