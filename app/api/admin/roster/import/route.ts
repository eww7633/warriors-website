import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { upsertRosterReservations } from "@/lib/hq/roster-reservations";

function parseRows(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return [];
  }

  const firstColumns = lines[0].split(",").map((value) => value.trim().toLowerCase());
  const hasHeader = firstColumns.includes("fullname") || firstColumns.includes("full_name");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const cols = line.split(",").map((value) => value.trim());
    const fullName = cols[0] || "";
    const email = cols[1] || undefined;
    const jerseyNumber = Number(cols[2] || "0");
    const rosterId = cols[3] || "main-player-roster";
    const primarySubRoster = cols[4];
    const usaHockeyNumber = cols[5] || undefined;
    const phone = cols[6] || undefined;
    const notes = cols[7] || undefined;
    return {
      fullName,
      email,
      jerseyNumber,
      rosterId,
      primarySubRoster:
        primarySubRoster === "gold" || primarySubRoster === "white" || primarySubRoster === "black"
          ? (primarySubRoster as "gold" | "white" | "black")
          : undefined,
      usaHockeyNumber,
      phone,
      notes
    };
  });
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const rawRows = String(formData.get("rows") ?? "");
  const parsedRows = parseRows(rawRows);

  if (parsedRows.length === 0) {
    return NextResponse.redirect(new URL("/admin?section=players&error=import_rows_required", request.url), 303);
  }

  try {
    const result = await upsertRosterReservations(parsedRows);
    const url = new URL("/admin?section=players", request.url);
    url.searchParams.set("imported", String(result.created.length));
    url.searchParams.set("updated", String(result.updated.length));
    url.searchParams.set("skipped", String(result.skipped.length));
    return NextResponse.redirect(url, 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=players&error=roster_import_failed", request.url), 303);
  }
}
