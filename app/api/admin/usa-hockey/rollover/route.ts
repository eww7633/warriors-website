import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { runUsaHockeySeasonRollover } from "@/lib/hq/player-profiles";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const season = String(formData.get("season") ?? "").trim();

  try {
    const result = await runUsaHockeySeasonRollover({
      season: season || undefined
    });
    return NextResponse.redirect(
      new URL(`/admin/roster?usaRollover=1&usaSeason=${encodeURIComponent(result.season)}&usaUpdated=${result.updated}`, request.url),
      303
    );
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "usa_hockey_rollover_failed");
    return NextResponse.redirect(new URL(`/admin/roster?error=${reason}`, request.url), 303);
  }
}
