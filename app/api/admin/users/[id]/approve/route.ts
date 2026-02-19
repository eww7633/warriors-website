import { NextResponse } from "next/server";
import { approvePlayer } from "@/lib/hq/store";
import { getCurrentUser } from "@/lib/hq/session";
import { upsertPlayerContactProfile } from "@/lib/hq/player-profiles";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const actor = await getCurrentUser();

  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const rosterId = String(formData.get("rosterId") ?? "").trim();
  const jerseyNumberRaw = String(formData.get("jerseyNumber") ?? "").trim();
  const primarySubRoster = String(formData.get("primarySubRoster") ?? "").trim();
  const allowCrossColorJerseyOverlap =
    String(formData.get("allowCrossColorJerseyOverlap") ?? "").trim() === "on";
  const jerseyNumber = jerseyNumberRaw ? Number(jerseyNumberRaw) : undefined;

  if (
    !rosterId ||
    (jerseyNumberRaw &&
      (!Number.isFinite(jerseyNumber) || Number(jerseyNumber) <= 0 || Number(jerseyNumber) > 99))
  ) {
    return NextResponse.redirect(new URL("/admin?section=players&error=invalid_approval_fields", request.url), 303);
  }

  try {
    await approvePlayer(params.id, rosterId, jerseyNumber);
    await upsertPlayerContactProfile({
      userId: params.id,
      primarySubRoster: ["gold", "white", "black"].includes(primarySubRoster)
        ? (primarySubRoster as "gold" | "white" | "black")
        : undefined,
      allowCrossColorJerseyOverlap
    });
    return NextResponse.redirect(new URL("/admin?section=players&approved=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=players&error=approval_failed", request.url), 303);
  }
}
