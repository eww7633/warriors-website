import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { readStore } from "@/lib/hq/store";
import { updateCentralRosterPlayer } from "@/lib/hq/roster";
import { upsertPlayerContactProfile } from "@/lib/hq/player-profiles";

function inferSubRoster(legacyRosterId?: string) {
  const value = (legacyRosterId || "").toLowerCase();
  if (value.includes("gold")) return "gold" as const;
  if (value.includes("white")) return "white" as const;
  if (value.includes("black")) return "black" as const;
  return undefined;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  try {
    const store = await readStore();
    const candidates = store.users.filter(
      (entry) =>
        entry.role === "player" &&
        entry.status === "approved" &&
        Boolean(entry.rosterId) &&
        entry.rosterId !== "main-player-roster"
    );

    let migrated = 0;
    for (const player of candidates) {
      const inferred = inferSubRoster(player.rosterId);
      const result = await updateCentralRosterPlayer({
        userId: player.id,
        fullName: player.fullName,
        rosterId: "main-player-roster",
        jerseyNumber: player.jerseyNumber,
        activityStatus: player.activityStatus ?? "active"
      });

      if (result.ok) {
        migrated += 1;
        if (inferred) {
          await upsertPlayerContactProfile({
            userId: player.id,
            primarySubRoster: inferred
          });
        }
      }
    }

    return NextResponse.redirect(
      new URL(`/admin/roster?legacyMigrated=${migrated}`, request.url),
      303
    );
  } catch {
    return NextResponse.redirect(new URL("/admin/roster?error=legacy_migration_failed", request.url), 303);
  }
}
