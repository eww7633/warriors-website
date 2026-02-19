import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { upsertPlayerContactProfile, usaHockeySeasonLabel } from "@/lib/hq/player-profiles";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
    }
    if (user.role !== "admin" && user.role !== "player") {
      return NextResponse.redirect(new URL("/player?error=approval_required", request.url), 303);
    }

    const formData = (await request.formData()) as unknown as {
      get: (name: string) => FormDataEntryValue | null;
    };
    const addressLine1 = String(formData.get("addressLine1") ?? "").trim();
    const addressLine2 = String(formData.get("addressLine2") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const stateProvince = String(formData.get("stateProvince") ?? "").trim();
    const postalCode = String(formData.get("postalCode") ?? "").trim();
    const country = String(formData.get("country") ?? "").trim();
    const usaHockeyNumber = String(formData.get("usaHockeyNumber") ?? "").trim();

    await upsertPlayerContactProfile({
      userId: user.id,
      address: {
        line1: addressLine1,
        line2: addressLine2,
        city,
        stateProvince,
        postalCode,
        country
      },
      usaHockeyNumber: usaHockeyNumber || undefined,
      usaHockeySeason: usaHockeyNumber ? usaHockeySeasonLabel() : undefined,
      usaHockeyStatus: usaHockeyNumber ? "unverified" : undefined,
      usaHockeySource: "player"
    });
    return NextResponse.redirect(new URL("/player?saved=profile", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/player?error=profile_update_failed", request.url), 303);
  }
}
