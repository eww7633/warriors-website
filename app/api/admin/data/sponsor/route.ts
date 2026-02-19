import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { createSponsor } from "@/lib/hq/ops-data";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const name = String(formData.get("name") ?? "").trim();
  const websiteUrl = String(formData.get("websiteUrl") ?? "").trim();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const isActive = String(formData.get("isActive") ?? "").trim() === "on";

  if (!name) {
    return NextResponse.redirect(new URL("/admin?section=sportsdata&error=sponsor_name_required", request.url), 303);
  }

  try {
    await createSponsor({
      name,
      websiteUrl: websiteUrl || undefined,
      logoUrl: logoUrl || undefined,
      notes: notes || undefined,
      isActive
    });
    return NextResponse.redirect(new URL("/admin?section=sportsdata&data=sponsor_created", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=sportsdata&error=sponsor_create_failed", request.url), 303);
  }
}
