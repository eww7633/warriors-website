import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { markContactLeadInvited } from "@/lib/hq/ops-data";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const contactLeadId = String(formData.get("contactLeadId") ?? "").trim();

  if (!contactLeadId) {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=missing_contact_id", request.url), 303);
  }

  try {
    await markContactLeadInvited(contactLeadId);
    return NextResponse.redirect(new URL("/admin?section=contacts&contact=invited", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=invite_mark_failed", request.url), 303);
  }
}
