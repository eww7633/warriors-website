import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { createPosition } from "@/lib/hq/ops-data";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
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
