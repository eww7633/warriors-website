import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { isSuperAdmin, upsertUserOpsRole } from "@/lib/hq/permissions";
import { readStore } from "@/lib/hq/store";

function parseRows(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes("email") && header.includes("role");
  const rows = hasHeader ? lines.slice(1) : lines;

  return rows.map((line) => {
    const cols = line.split(",").map((entry) => entry.trim());
    return {
      email: (cols[0] || "").toLowerCase(),
      roleKey: cols[1] || "",
      titleLabel: cols[2] || "",
      officialEmail: cols[3] || "",
      badgeLabel: cols[4] || ""
    };
  });
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await isSuperAdmin(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const rawRows = String(formData.get("rows") ?? "");
  const rows = parseRows(rawRows);

  if (rows.length === 0) {
    return NextResponse.redirect(new URL("/admin?section=players&error=ops_role_rows_required", request.url), 303);
  }

  const store = await readStore();
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const user = store.users.find((entry) => entry.email.toLowerCase() === row.email);
    if (!user || !row.roleKey) {
      skipped += 1;
      continue;
    }

    try {
      await upsertUserOpsRole({
        actorUserId: actor.id,
        targetUserId: user.id,
        roleKey: row.roleKey as
          | "super_admin"
          | "president"
          | "vp_hockey_ops"
          | "general_manager"
          | "assistant_general_manager"
          | "equipment_manager"
          | "technology_manager"
          | "dvhl_manager"
          | "media_manager",
        titleLabel: row.titleLabel,
        officialEmail: row.officialEmail,
        badgeLabel: row.badgeLabel
      });
      updated += 1;
    } catch {
      skipped += 1;
    }
  }

  const url = new URL("/admin?section=players", request.url);
  url.searchParams.set("opsrole", "updated");
  url.searchParams.set("opsUpdated", String(updated));
  url.searchParams.set("opsSkipped", String(skipped));
  return NextResponse.redirect(url, 303);
}
