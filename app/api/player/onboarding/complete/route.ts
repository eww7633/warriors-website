import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { upsertPlayerContactProfile, usaHockeySeasonLabel } from "@/lib/hq/player-profiles";
import { upsertEquipmentSizes } from "@/lib/hq/store";
import { upsertPlayerOnboardingState } from "@/lib/hq/player-onboarding";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  const formData = await request.formData();
  const addressLine1 = String(formData.get("addressLine1") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const stateProvince = String(formData.get("stateProvince") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();
  const usaHockeyNumber = String(formData.get("usaHockeyNumber") ?? "").trim();
  const needsEquipment = String(formData.get("needsEquipment") ?? "").trim() === "on";
  const ack = String(formData.get("acknowledgementsCompleted") ?? "").trim() === "on";

  if (!addressLine1 || !city || !stateProvince || !postalCode || !ack) {
    return NextResponse.redirect(new URL("/player?section=onboarding&error=onboarding_fields_required", request.url), 303);
  }

  const equipment = {
    helmet: String(formData.get("helmet") ?? "").trim(),
    gloves: String(formData.get("gloves") ?? "").trim(),
    skates: String(formData.get("skates") ?? "").trim(),
    pants: String(formData.get("pants") ?? "").trim(),
    stick: String(formData.get("stick") ?? "").trim(),
    jersey: String(formData.get("jersey") ?? "").trim(),
    shell: String(formData.get("shell") ?? "").trim(),
    warmupTop: String(formData.get("warmupTop") ?? "").trim(),
    warmupBottom: String(formData.get("warmupBottom") ?? "").trim()
  };

  try {
    await upsertPlayerContactProfile({
      userId: user.id,
      address: {
        line1: addressLine1,
        city,
        stateProvince,
        postalCode,
        country: "USA"
      },
      needsEquipment,
      usaHockeyNumber: usaHockeyNumber || undefined,
      usaHockeySeason: usaHockeyNumber ? usaHockeySeasonLabel() : undefined,
      usaHockeyStatus: usaHockeyNumber ? "unverified" : undefined,
      usaHockeySource: "player"
    });

    await upsertEquipmentSizes(user.id, equipment);
    await upsertPlayerOnboardingState({
      userId: user.id,
      profileCompleted: true,
      equipmentCompleted: true,
      acknowledgementsCompleted: true
    });

    return NextResponse.redirect(new URL("/player?section=onboarding&saved=onboarding", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/player?section=onboarding&error=onboarding_save_failed", request.url), 303);
  }
}
