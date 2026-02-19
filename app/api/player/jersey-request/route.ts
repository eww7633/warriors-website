import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { createJerseyNumberRequest } from "@/lib/hq/player-requests";
import { listCentralRosterPlayers, updateCentralRosterPlayer } from "@/lib/hq/roster";
import { getPlayerProfileExtra, listJerseyOptionsForPlayer } from "@/lib/hq/player-profiles";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  if (user.role !== "player" || user.status !== "approved") {
    return NextResponse.redirect(new URL("/player?error=approval_required", request.url), 303);
  }

  if (!user.rosterId) {
    return NextResponse.redirect(new URL("/player?error=roster_not_assigned", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };

  const requestedJerseyNumber = Number(String(formData.get("requestedJerseyNumber") ?? "").trim());

  if (!Number.isInteger(requestedJerseyNumber) || requestedJerseyNumber < 1 || requestedJerseyNumber > 99) {
    return NextResponse.redirect(new URL("/player?error=invalid_jersey_number", request.url), 303);
  }

  const [profile, options, players] = await Promise.all([
    getPlayerProfileExtra(user.id),
    listJerseyOptionsForPlayer({ userId: user.id, currentJerseyNumber: user.jerseyNumber }),
    listCentralRosterPlayers()
  ]);
  const selectedOption = options.find((entry) => entry.number === requestedJerseyNumber);

  if (!selectedOption && requestedJerseyNumber !== user.jerseyNumber) {
    return NextResponse.redirect(new URL("/player?error=jersey_number_unavailable", request.url), 303);
  }

  if (requestedJerseyNumber === user.jerseyNumber) {
    return NextResponse.redirect(new URL("/player?error=already_your_current_number", request.url), 303);
  }

  if (!profile.primarySubRoster) {
    return NextResponse.redirect(new URL("/player?error=primary_sub_roster_required", request.url), 303);
  }

  try {
    const player = players.find((entry) => entry.id === user.id);
    if (!player) {
      throw new Error("player_not_found");
    }

    if (selectedOption && !selectedOption.requiresApproval) {
      const result = await updateCentralRosterPlayer({
        userId: player.id,
        fullName: player.fullName,
        rosterId: player.rosterId,
        jerseyNumber: requestedJerseyNumber,
        activityStatus: player.activityStatus
      });
      if (!result.ok) {
        throw new Error(result.reason || "jersey_auto_grant_failed");
      }
      return NextResponse.redirect(new URL("/player?saved=jersey_auto_granted", request.url), 303);
    }

    await createJerseyNumberRequest({
      userId: user.id,
      rosterId: user.rosterId,
      primarySubRoster: profile.primarySubRoster,
      requiresApproval: true,
      approvalReason: selectedOption?.reason,
      currentJerseyNumber: user.jerseyNumber,
      requestedJerseyNumber
    });
    return NextResponse.redirect(new URL("/player?saved=jersey_request", request.url), 303);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "jersey_request_failed";
    return NextResponse.redirect(
      new URL(`/player?error=${encodeURIComponent(reason)}`, request.url),
      303
    );
  }
}
