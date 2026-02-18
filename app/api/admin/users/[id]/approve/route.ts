import { NextResponse } from "next/server";
import { approvePlayer } from "@/lib/hq/store";
import { getCurrentUser } from "@/lib/hq/session";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const actor = await getCurrentUser();

  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const rosterId = String(formData.get("rosterId") ?? "").trim();
  const jerseyNumber = Number(String(formData.get("jerseyNumber") ?? "0"));

  if (!rosterId || !Number.isFinite(jerseyNumber) || jerseyNumber <= 0) {
    return NextResponse.redirect(new URL("/admin?error=invalid_approval_fields", request.url), 303);
  }

  try {
    await approvePlayer(params.id, rosterId, jerseyNumber);
    return NextResponse.redirect(new URL("/admin?approved=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?error=approval_failed", request.url), 303);
  }
}
