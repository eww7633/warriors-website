import { NextResponse } from "next/server";
import {
  acceptDvhlSubRequest,
  cancelDvhlSubRequest,
  createDvhlSubRequest,
  getDvhlWorkflowContext,
  listDvhlSubRequests
} from "@/lib/hq/dvhl-workflows";
import { userHasPermission } from "@/lib/hq/permissions";
import { getCurrentUser } from "@/lib/hq/session";

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
  const action = String(formData.get("action") ?? "create").trim();
  const requestId = String(formData.get("requestId") ?? "").trim();
  const competitionId = String(formData.get("competitionId") ?? "").trim();
  const teamId = String(formData.get("teamId") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const neededForGameId = String(formData.get("neededForGameId") ?? "").trim();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/player/dvhl?tab=subs";

  const canManageDvhl = await userHasPermission(actor, "manage_dvhl");
  const { teamControlMap } = await getDvhlWorkflowContext();

  try {
    if (action === "accept") {
      if (!requestId) {
        return NextResponse.redirect(new URL(withParam(returnTo, "error", "missing_sub_request_id"), request.url), 303);
      }
      const all = await listDvhlSubRequests();
      const requestEntry = all.find((entry) => entry.id === requestId);
      if (!requestEntry) {
        return NextResponse.redirect(new URL(withParam(returnTo, "error", "sub_request_not_found"), request.url), 303);
      }
      const control = teamControlMap[requestEntry.teamId];
      const isEligibleSub = (control?.subPoolUserIds || []).includes(actor.id);
      if (!isEligibleSub && !canManageDvhl) {
        return NextResponse.redirect(new URL(withParam(returnTo, "error", "not_in_sub_pool"), request.url), 303);
      }
      await acceptDvhlSubRequest({
        requestId,
        actorUserId: actor.id
      });
      return NextResponse.redirect(new URL(withParam(returnTo, "dvhl", "sub_request_accepted"), request.url), 303);
    }

    if (action === "cancel") {
      if (!requestId) {
        return NextResponse.redirect(new URL(withParam(returnTo, "error", "missing_sub_request_id"), request.url), 303);
      }
      const all = await listDvhlSubRequests();
      const requestEntry = all.find((entry) => entry.id === requestId);
      if (!requestEntry) {
        return NextResponse.redirect(new URL(withParam(returnTo, "error", "sub_request_not_found"), request.url), 303);
      }
      const control = teamControlMap[requestEntry.teamId];
      const isCaptain = control?.captainUserId === actor.id;
      const isRequester = requestEntry.requestedByUserId === actor.id;
      if (!isCaptain && !isRequester && !canManageDvhl) {
        return NextResponse.redirect(new URL(withParam(returnTo, "error", "sub_request_cancel_not_authorized"), request.url), 303);
      }
      await cancelDvhlSubRequest({
        requestId,
        actorUserId: actor.id
      });
      return NextResponse.redirect(new URL(withParam(returnTo, "dvhl", "sub_request_cancelled"), request.url), 303);
    }

    if (!competitionId || !teamId) {
      return NextResponse.redirect(new URL(withParam(returnTo, "error", "missing_sub_request_fields"), request.url), 303);
    }

    const control = teamControlMap[teamId];
    const isCaptain = control?.captainUserId === actor.id;
    if (!isCaptain && !canManageDvhl) {
      return NextResponse.redirect(new URL(withParam(returnTo, "error", "captain_access_required"), request.url), 303);
    }

    await createDvhlSubRequest({
      competitionId,
      teamId,
      captainUserId: control?.captainUserId || actor.id,
      requestedByUserId: actor.id,
      message,
      neededForGameId: neededForGameId || undefined
    });
    return NextResponse.redirect(new URL(withParam(returnTo, "dvhl", "sub_request_created"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "dvhl_sub_request_failed"), request.url), 303);
  }
}
