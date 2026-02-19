import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { createDvhl } from "@/lib/hq/competitions";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const teamNames: [string, string, string, string] = [
    String(formData.get("team1") ?? "").trim(),
    String(formData.get("team2") ?? "").trim(),
    String(formData.get("team3") ?? "").trim(),
    String(formData.get("team4") ?? "").trim()
  ];

  if (!title) {
    return NextResponse.redirect(new URL("/admin?error=missing_dvhl_title", request.url), 303);
  }

  try {
    await createDvhl({ title, startsAt, notes, teamNames });
    return NextResponse.redirect(new URL("/admin?competition=created", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?error=dvhl_create_failed", request.url), 303);
  }
}
