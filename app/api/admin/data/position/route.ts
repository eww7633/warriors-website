import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { createPosition } from "@/lib/hq/ops-data";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const code = String(formData.get("code") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  if (!code || !label) {
    return NextResponse.redirect(new URL("/admin?section=sportsdata&error=position_code_and_label_required", request.url), 303);
  }

  try {
    await createPosition({ code, label });
    return NextResponse.redirect(new URL("/admin?section=sportsdata&data=position_created", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=sportsdata&error=position_create_failed", request.url), 303);
  }
}
