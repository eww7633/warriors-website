import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { linkContactLeadToMatchingUser } from "@/lib/hq/ops-data";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const contactLeadId = String(formData.get("contactLeadId") ?? "").trim();

  if (!contactLeadId) {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=missing_contact_id", request.url), 303);
  }

  try {
    await linkContactLeadToMatchingUser(contactLeadId);
    return NextResponse.redirect(new URL("/admin?section=contacts&contact=linked", request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(
      error instanceof Error ? error.message : "Unable to link contact."
    );
    return NextResponse.redirect(
      new URL(`/admin?section=contacts&error=link_failed&errorDetail=${reason}`, request.url),
      303
    );
  }
}
