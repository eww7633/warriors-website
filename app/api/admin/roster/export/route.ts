import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { listCentralRosterPlayers } from "@/lib/hq/roster";

export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !canAccessAdminPanel(actor)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const activity = url.searchParams.get("activity");
  const players = (await listCentralRosterPlayers()).filter((player) => {
    if ((activity === "active" || activity === "inactive") && player.activityStatus !== activity) {
      return false;
    }

    if (!q) {
      return true;
    }

    return [
      player.fullName,
      player.email,
      player.rosterId ?? "",
      player.jerseyNumber?.toString() ?? ""
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
  const rows = [
    ["Name", "Email", "Status", "Activity", "Roster", "Number", "Competition History"],
    ...players.map((player) => [
      player.fullName,
      player.email,
      player.status,
      player.activityStatus,
      player.rosterId ?? "",
      player.jerseyNumber?.toString() ?? "",
      player.competitionHistory.join(" | ")
    ])
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="warriors-central-roster-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
