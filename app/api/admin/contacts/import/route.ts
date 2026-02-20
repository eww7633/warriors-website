import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import { importContactLeads } from "@/lib/hq/ops-data";

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseRows(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes("name") || header.includes("email") || header.includes("phone");
  const rows = hasHeader ? lines.slice(1) : lines;

  return rows.map((line) => {
    const cols = splitCsvLine(line);
    return {
      fullName: cols[0] || "",
      email: cols[1] || "",
      phone: cols[2] || "",
      tags: cols[3] || "",
      notes: cols[4] || ""
    };
  });
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor)) || !(await userHasPermission(actor, "manage_site_users"))) {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const source = String(formData.get("source") ?? "wix").trim() || "wix";
  const uploadedCsv = formData.get("csvFile");
  const uploadedCsvText = uploadedCsv instanceof File && uploadedCsv.size > 0 ? await uploadedCsv.text() : "";
  const rowsRaw = uploadedCsvText || String(formData.get("rows") ?? "");
  const rows = parseRows(rowsRaw);

  if (rows.length === 0) {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=contact_rows_required", request.url), 303);
  }

  try {
    const result = await importContactLeads({ source, rows });
    const url = new URL("/admin?section=contacts", request.url);
    url.searchParams.set("contact", "imported");
    url.searchParams.set("imported", String(result.imported));
    url.searchParams.set("updated", String(result.updated));
    url.searchParams.set("skipped", String(result.skipped));
    return NextResponse.redirect(url, 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=contact_import_failed", request.url), 303);
  }
}
