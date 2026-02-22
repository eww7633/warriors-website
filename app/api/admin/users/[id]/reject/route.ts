import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { rejectPlayer } from "@/lib/hq/store";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const actor = await getCurrentUser();

  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  try {
    await rejectPlayer(params.id);
    return NextResponse.redirect(new URL("/admin?section=players&rejected=1", request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "reject_failed");
    return NextResponse.redirect(
      new URL(`/admin?section=players&error=reject_failed&errorDetail=${reason}`, request.url),
      303
    );
  }
}
