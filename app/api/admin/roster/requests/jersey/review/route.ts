import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { listCentralRosterPlayers, updateCentralRosterPlayer } from "@/lib/hq/roster";
import {
  listPendingJerseyNumberRequests,
  reviewJerseyNumberRequest
} from "@/lib/hq/player-requests";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };

  const requestId = String(formData.get("requestId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const notes = String(formData.get("reviewNotes") ?? "").trim();

  if (!requestId || (decision !== "approved" && decision !== "rejected")) {
    return NextResponse.redirect(new URL("/admin/roster?error=invalid_jersey_review_payload", request.url), 303);
  }

  try {
    const pending = (await listPendingJerseyNumberRequests()).find((entry) => entry.id === requestId);
    if (!pending) {
      throw new Error("jersey_request_not_found");
    }

    if (decision === "approved") {
      const player = (await listCentralRosterPlayers()).find((entry) => entry.id === pending.userId);
      if (!player) {
        throw new Error("player_not_found");
      }

      const result = await updateCentralRosterPlayer({
        userId: player.id,
        fullName: player.fullName,
        rosterId: player.rosterId,
        jerseyNumber: pending.requestedJerseyNumber,
        activityStatus: player.activityStatus,
        forceNumberOverlap: Boolean(pending.requiresApproval)
      });

      if (!result.ok) {
        throw new Error(result.reason || "jersey_update_failed");
      }
    }

    await reviewJerseyNumberRequest({
      requestId,
      reviewedByUserId: actor.id,
      decision,
      reviewNotes: notes
    });

    return NextResponse.redirect(new URL(`/admin/roster?request=${decision}`, request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "jersey_review_failed");
    return NextResponse.redirect(new URL(`/admin/roster?error=${reason}`, request.url), 303);
  }
}
