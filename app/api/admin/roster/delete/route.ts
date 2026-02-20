import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { deleteCentralRosterPlayer } from "@/lib/hq/roster";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !canAccessAdminPanel(actor)) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) {
    return NextResponse.redirect(new URL("/admin/roster?error=missing_player_id", request.url), 303);
  }

  try {
    await deleteCentralRosterPlayer(userId);
    return NextResponse.redirect(new URL("/admin/roster?deleted=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin/roster?error=delete_failed", request.url), 303);
  }
}
