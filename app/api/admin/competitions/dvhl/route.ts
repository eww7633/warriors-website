import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { createDvhl } from "@/lib/hq/competitions";

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
  const title = String(formData.get("title") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const target = returnTo.startsWith("/") ? returnTo : "/admin?section=competitions";

  const teamNames: [string, string, string, string] = [
    String(formData.get("team1") ?? "").trim(),
    String(formData.get("team2") ?? "").trim(),
    String(formData.get("team3") ?? "").trim(),
    String(formData.get("team4") ?? "").trim()
  ];

  if (!title) {
    return NextResponse.redirect(new URL(withParam(target, "error", "missing_dvhl_title"), request.url), 303);
  }

  try {
    await createDvhl({ title, startsAt, notes, teamNames });
    return NextResponse.redirect(new URL(withParam(target, "competition", "created"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(target, "error", "dvhl_create_failed"), request.url), 303);
  }
}
