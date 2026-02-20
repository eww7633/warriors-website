import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { replaceOnboardingChecklistTemplate } from "@/lib/hq/onboarding";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };

  const raw = String(formData.get("template") ?? "");
  const labels = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  try {
    await replaceOnboardingChecklistTemplate({
      labels,
      updatedByUserId: actor.id
    });
    return NextResponse.redirect(new URL("/admin?section=contacts&onboardingTemplate=updated", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=onboarding_template_update_failed", request.url), 303);
  }
}
