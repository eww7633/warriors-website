import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { createEventType } from "@/lib/hq/events";

export async function POST(request: Request) {
  const actor = await getCurrentUser();

  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return NextResponse.redirect(new URL("/admin?section=events&error=missing_event_type_name", request.url), 303);
  }

  try {
    await createEventType({ name });
    return NextResponse.redirect(new URL("/admin?section=events&eventtype=created", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=events&error=event_type_create_failed", request.url), 303);
  }
}
