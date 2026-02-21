import { NextResponse } from "next/server";
import { setPlayerJerseyAvailability } from "@/lib/hq/jersey-plans";
import { getPrismaClient } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/hq/session";

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || (actor.role !== "player" && actor.role !== "admin") || actor.status !== "approved") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const gameId = String(formData.get("gameId") ?? "").trim();
  const availability = String(formData.get("availability") ?? "have").trim();
  const hasJersey = availability !== "missing";
  const note = String(formData.get("note") ?? "").trim();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/games";

  if (!gameId) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "missing_game_id"), request.url), 303);
  }

  const game = await getPrismaClient().competitionGame.findUnique({
    where: { id: gameId },
    include: {
      team: {
        select: {
          id: true,
          members: {
            select: {
              userId: true
            }
          }
        }
      }
    }
  });
  if (!game) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "game_not_found"), request.url), 303);
  }

  const isTeamMember = game.team.members.some((member) => member.userId === actor.id);
  if (actor.role !== "admin" && !isTeamMember) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "jersey_availability_forbidden"), request.url), 303);
  }

  try {
    await setPlayerJerseyAvailability({
      gameId: game.id,
      teamId: game.team.id,
      userId: actor.id,
      hasJersey,
      note
    });
    return NextResponse.redirect(new URL(withParam(returnTo, "jersey", "availability_saved"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "jersey_availability_save_failed"), request.url), 303);
  }
}

