import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/hq/session";
import { getPlayerProfileExtra, upsertPlayerContactProfile, usaHockeySeasonLabel } from "@/lib/hq/player-profiles";
import { MemberUser } from "@/lib/types";

function profileShape(user: MemberUser, profile: Awaited<ReturnType<typeof getPlayerProfileExtra>>) {
  const canViewRosterMemberDetails = user.role === "admin" || (user.role === "player" && user.status === "approved");
  const mobileRole = user.role === "public" ? "supporter" : user.role;
  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: mobileRole,
      status: user.status,
      rosterId: user.rosterId || null,
      jerseyNumber: user.jerseyNumber ?? null
    },
    profile: {
      address: profile.address || null,
      primarySubRoster: profile.primarySubRoster || null,
      usaHockeyNumber: profile.usaHockeyNumber || null,
      usaHockeySeason: profile.usaHockeySeason || null,
      usaHockeyStatus: profile.usaHockeyStatus || "unverified",
      needsEquipment: Boolean(profile.needsEquipment),
      playerExperienceSummary: profile.playerExperienceSummary || null,
      codeOfConductAcceptedAt: profile.codeOfConductAcceptedAt || null
    },
    rosterPrivacy: {
      canViewMemberDetails: canViewRosterMemberDetails,
      visibility: canViewRosterMemberDetails ? "members" : "counts"
    }
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const profile = await getPlayerProfileExtra(user.id);
  return NextResponse.json(profileShape(user, profile));
}

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin" && user.role !== "player") {
    return NextResponse.json({ error: "approval_required" }, { status: 403 });
  }

  let payload: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    stateProvince?: string;
    postalCode?: string;
    country?: string;
    usaHockeyNumber?: string;
    needsEquipment?: boolean;
    playerExperienceSummary?: string;
  } = {};
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const usaHockeyNumber = String(payload.usaHockeyNumber ?? "").trim();
  await upsertPlayerContactProfile({
    userId: user.id,
    address: {
      line1: String(payload.addressLine1 ?? "").trim(),
      line2: String(payload.addressLine2 ?? "").trim(),
      city: String(payload.city ?? "").trim(),
      stateProvince: String(payload.stateProvince ?? "").trim(),
      postalCode: String(payload.postalCode ?? "").trim(),
      country: String(payload.country ?? "").trim()
    },
    usaHockeyNumber: usaHockeyNumber || undefined,
    usaHockeySeason: usaHockeyNumber ? usaHockeySeasonLabel() : undefined,
    usaHockeyStatus: usaHockeyNumber ? "unverified" : undefined,
    usaHockeySource: "player",
    needsEquipment: Boolean(payload.needsEquipment),
    playerExperienceSummary: String(payload.playerExperienceSummary ?? "").trim() || undefined
  });

  const updated = await getPlayerProfileExtra(user.id);
  return NextResponse.json({ ok: true, ...profileShape(user, updated) });
}
