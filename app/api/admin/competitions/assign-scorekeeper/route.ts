import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { assignGameScorekeeper } from "@/lib/hq/competitions";

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const gameId = String(formData.get("gameId") ?? "").trim();
  const scorekeeperType = String(formData.get("scorekeeperType") ?? "none").trim();
  const scorekeeperUserId = String(formData.get("scorekeeperUserId") ?? "").trim();
  const scorekeeperStaffId = String(formData.get("scorekeeperStaffId") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const target = returnTo.startsWith("/") ? returnTo : "/admin?section=competitions";

  if (!gameId) {
    return NextResponse.redirect(new URL(withParam(target, "error", "missing_game_id"), request.url), 303);
  }

  try {
    await assignGameScorekeeper({
      gameId,
      scorekeeperType: scorekeeperType as "none" | "player" | "staff",
      scorekeeperUserId,
      scorekeeperStaffId
    });

    return NextResponse.redirect(new URL(withParam(target, "scorekeeper", "saved"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(target, "error", "scorekeeper_assign_failed"), request.url), 303);
  }
}
