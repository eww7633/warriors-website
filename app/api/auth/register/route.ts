import { NextResponse } from "next/server";
import { createPendingPlayer } from "@/lib/hq/store";
import { upsertPlayerContactProfile, usaHockeySeasonLabel } from "@/lib/hq/player-profiles";

export async function POST(request: Request) {
  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const requestedPosition = String(formData.get("position") ?? "").trim();
  const playerExperienceSummary = String(formData.get("playerExperienceSummary") ?? "").trim();
  const acceptCodeOfConduct = String(formData.get("acceptCodeOfConduct") ?? "").trim() === "on";
  const addressLine1 = String(formData.get("addressLine1") ?? "").trim();
  const addressLine2 = String(formData.get("addressLine2") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const stateProvince = String(formData.get("stateProvince") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const usaHockeyNumber = String(formData.get("usaHockeyNumber") ?? "").trim();
  const needsEquipment = String(formData.get("needsEquipment") ?? "").trim() === "on";

  if (!fullName || !email || !password) {
    return NextResponse.redirect(new URL("/join?error=missing_fields", request.url), 303);
  }

  if (password.length < 8) {
    return NextResponse.redirect(new URL("/join?error=password_too_short", request.url), 303);
  }
  if (!requestedPosition || !playerExperienceSummary || !acceptCodeOfConduct) {
    return NextResponse.redirect(new URL("/join?error=player_application_incomplete", request.url), 303);
  }

  try {
    const created = await createPendingPlayer({
      fullName,
      email,
      password,
      phone,
      requestedPosition
    });
    await upsertPlayerContactProfile({
      userId: created.id,
      address: {
        line1: addressLine1,
        line2: addressLine2,
        city,
        stateProvince,
        postalCode,
        country
      },
      needsEquipment,
      usaHockeyNumber: usaHockeyNumber || undefined,
      usaHockeySeason: usaHockeyNumber ? usaHockeySeasonLabel() : undefined,
      usaHockeyStatus: usaHockeyNumber ? "unverified" : "pending_renewal",
      usaHockeySource: "player",
      playerExperienceSummary,
      codeOfConductAcceptedAt: new Date().toISOString()
    });
    return NextResponse.redirect(new URL("/login?registered=1", request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";
    return NextResponse.redirect(
      new URL(`/join?error=${encodeURIComponent(message)}`, request.url),
      303
    );
  }
}
