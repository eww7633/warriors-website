import { NextResponse } from "next/server";
import { getDvhlTeamControlMap } from "@/lib/hq/dvhl";
import { setGameJerseyDirective, type JerseyInstruction } from "@/lib/hq/jersey-plans";
import { userHasPermission } from "@/lib/hq/permissions";
import { getPrismaClient } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/hq/session";

const allowedInstructions: JerseyInstruction[] = [
  "home_dark",
  "home_light",
  "away_dark",
  "away_light",
  "both_sets",
  "custom"
];

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.status !== "approved") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const gameId = String(formData.get("gameId") ?? "").trim();
  const instructionRaw = String(formData.get("instruction") ?? "").trim();
  const instruction = allowedInstructions.includes(instructionRaw as JerseyInstruction)
    ? (instructionRaw as JerseyInstruction)
    : "custom";
  const note = String(formData.get("note") ?? "").trim();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/games";

  if (!gameId) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "missing_game_id"), request.url), 303);
  }

  const game = await getPrismaClient().competitionGame.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      teamId: true,
      competitionId: true
    }
  });
  if (!game) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "game_not_found"), request.url), 303);
  }

  const canManage =
    actor.role === "admin" ||
    (await userHasPermission(actor, "manage_events")) ||
    (await userHasPermission(actor, "manage_dvhl"));
  const controls = await getDvhlTeamControlMap([game.teamId]);
  const isCaptain = controls[game.teamId]?.captainUserId === actor.id;

  if (!canManage && !isCaptain) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "jersey_directive_forbidden"), request.url), 303);
  }

  try {
    await setGameJerseyDirective({
      gameId: game.id,
      competitionId: game.competitionId,
      teamId: game.teamId,
      instruction,
      note,
      updatedByUserId: actor.id
    });
    return NextResponse.redirect(new URL(withParam(returnTo, "jersey", "directive_saved"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "jersey_directive_save_failed"), request.url), 303);
  }
}

