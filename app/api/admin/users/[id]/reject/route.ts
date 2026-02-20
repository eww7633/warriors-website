import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { rejectPlayer } from "@/lib/hq/store";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const actor = await getCurrentUser();

  if (!actor || !canAccessAdminPanel(actor)) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  try {
    await rejectPlayer(params.id);
    return NextResponse.redirect(new URL("/admin?section=players&rejected=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=players&error=reject_failed", request.url), 303);
  }
}
