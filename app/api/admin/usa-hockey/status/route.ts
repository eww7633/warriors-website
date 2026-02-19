import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { setUsaHockeyStatus } from "@/lib/hq/player-profiles";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };

  const userId = String(formData.get("userId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const season = String(formData.get("season") ?? "").trim();
  const number = String(formData.get("number") ?? "").trim();
  const expiresAt = String(formData.get("expiresAt") ?? "").trim();

  if (!userId || !["unverified", "verified", "pending_renewal", "expired"].includes(status)) {
    return NextResponse.redirect(new URL("/admin/roster?error=invalid_usa_hockey_status", request.url), 303);
  }

  try {
    await setUsaHockeyStatus({
      userId,
      status: status as "unverified" | "verified" | "pending_renewal" | "expired",
      season: season || undefined,
      number: number || undefined,
      expiresAt: expiresAt || undefined,
      source: "manual"
    });
    return NextResponse.redirect(new URL("/admin/roster?usaStatus=updated", request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "usa_hockey_status_failed");
    return NextResponse.redirect(new URL(`/admin/roster?error=${reason}`, request.url), 303);
  }
}
