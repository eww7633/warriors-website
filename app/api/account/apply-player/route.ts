import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { submitPlayerApplication } from "@/lib/hq/store";
import { upsertPlayerContactProfile, usaHockeySeasonLabel } from "@/lib/hq/player-profiles";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  const formData = await request.formData();
  const requestedPosition = String(formData.get("position") ?? "").trim();
  const playerExperienceSummary = String(formData.get("playerExperienceSummary") ?? "").trim();
  const usaHockeyNumber = String(formData.get("usaHockeyNumber") ?? "").trim();
  const needsEquipment = String(formData.get("needsEquipment") ?? "").trim() === "on";
  const acceptCodeOfConduct = String(formData.get("acceptCodeOfConduct") ?? "").trim() === "on";

  if (!requestedPosition || !playerExperienceSummary || !acceptCodeOfConduct) {
    return NextResponse.redirect(new URL("/account?error=player_application_incomplete", request.url), 303);
  }

  try {
    await submitPlayerApplication({
      userId: user.id,
      requestedPosition
    });
    await upsertPlayerContactProfile({
      userId: user.id,
      needsEquipment,
      usaHockeyNumber: usaHockeyNumber || undefined,
      usaHockeySeason: usaHockeyNumber ? usaHockeySeasonLabel() : undefined,
      usaHockeyStatus: usaHockeyNumber ? "unverified" : "pending_renewal",
      usaHockeySource: "player",
      playerExperienceSummary,
      codeOfConductAcceptedAt: new Date().toISOString()
    });
    return NextResponse.redirect(new URL("/account?saved=player_application", request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "player_application_failed");
    return NextResponse.redirect(new URL(`/account?error=${reason}`, request.url), 303);
  }
}
