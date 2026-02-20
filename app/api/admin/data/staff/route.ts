import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { createStaffProfile } from "@/lib/hq/ops-data";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const isActive = String(formData.get("isActive") ?? "").trim() === "on";

  if (!fullName || !jobTitle) {
    return NextResponse.redirect(new URL("/admin?section=sportsdata&error=staff_name_and_job_title_required", request.url), 303);
  }

  try {
    await createStaffProfile({
      fullName,
      email: email || undefined,
      phone: phone || undefined,
      jobTitle,
      bio: bio || undefined,
      isActive
    });
    return NextResponse.redirect(new URL("/admin?section=sportsdata&data=staff_created", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=sportsdata&error=staff_create_failed", request.url), 303);
  }
}
