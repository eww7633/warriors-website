import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { updateUserIdentity } from "@/lib/hq/user-admin";
import { upsertPlayerContactProfile } from "@/lib/hq/player-profiles";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const actor = await getCurrentUser();

  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const requestedPosition = String(formData.get("requestedPosition") ?? "").trim();
  const usaHockeyNumber = String(formData.get("usaHockeyNumber") ?? "").trim();
  const usaHockeySeason = String(formData.get("usaHockeySeason") ?? "").trim();
  const usaHockeyStatus = String(formData.get("usaHockeyStatus") ?? "").trim();
  const usaHockeyExpiresAt = String(formData.get("usaHockeyExpiresAt") ?? "").trim();
  const primarySubRoster = String(formData.get("primarySubRoster") ?? "").trim();
  const allowCrossColorJerseyOverlap =
    String(formData.get("allowCrossColorJerseyOverlap") ?? "").trim() === "on";
  const addressLine1 = String(formData.get("addressLine1") ?? "").trim();
  const addressLine2 = String(formData.get("addressLine2") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const stateProvince = String(formData.get("stateProvince") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "").trim();

  try {
    await updateUserIdentity({
      actorUserId: actor.id,
      targetUserId: params.id,
      fullName,
      email,
      phone,
      requestedPosition,
      newPassword
    });
    await upsertPlayerContactProfile({
      userId: params.id,
      address: {
        line1: addressLine1,
        line2: addressLine2,
        city,
        stateProvince,
        postalCode,
        country
      },
      primarySubRoster: ["gold", "white", "black"].includes(primarySubRoster)
        ? (primarySubRoster as "gold" | "white" | "black")
        : undefined,
      allowCrossColorJerseyOverlap,
      usaHockeyNumber,
      usaHockeySeason: usaHockeySeason || undefined,
      usaHockeyStatus: ["unverified", "verified", "pending_renewal", "expired"].includes(usaHockeyStatus)
        ? (usaHockeyStatus as "unverified" | "verified" | "pending_renewal" | "expired")
        : undefined,
      usaHockeySource: "manual",
      usaHockeyExpiresAt: usaHockeyExpiresAt || undefined
    });
    return NextResponse.redirect(new URL("/admin/roster?saved=1", request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "identity_update_failed");
    return NextResponse.redirect(new URL(`/admin/roster?error=${reason}`, request.url), 303);
  }
}
