import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { setOnboardingChecklistItem } from "@/lib/hq/onboarding";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };

  const userId = String(formData.get("userId") ?? "").trim();
  const checklistItemId = String(formData.get("checklistItemId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const completed = String(formData.get("completed") ?? "") === "1";
  const returnTo = String(formData.get("returnTo") ?? "/admin?section=contacts").trim();
  const sep = returnTo.includes("?") ? "&" : "?";

  if (!userId || !checklistItemId) {
    return NextResponse.redirect(new URL(`${returnTo}${sep}error=missing_onboarding_fields`, request.url), 303);
  }

  try {
    await setOnboardingChecklistItem({
      userId,
      checklistItemId,
      completed,
      note,
      updatedByUserId: actor.id
    });
    return NextResponse.redirect(new URL(`${returnTo}${sep}onboardingCheck=saved`, request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(`${returnTo}${sep}error=onboarding_check_failed`, request.url), 303);
  }
}
