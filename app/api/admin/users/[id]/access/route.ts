import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { setUserRole } from "@/lib/hq/access";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const actor = await getCurrentUser();

  if (!actor || !canAccessAdminPanel(actor)) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const role = String(formData.get("role") ?? "").trim();

  if (!["public", "player", "admin"].includes(role)) {
    return NextResponse.redirect(new URL("/admin?section=players&error=invalid_role", request.url), 303);
  }

  try {
    await setUserRole({
      actorUserId: actor.id,
      targetUserId: params.id,
      role: role as "public" | "player" | "admin"
    });
    return NextResponse.redirect(new URL("/admin?section=players&userrole=updated", request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(
      error instanceof Error ? error.message : "role_update_failed"
    );
    return NextResponse.redirect(
      new URL(`/admin?section=players&error=role_update_failed&errorDetail=${reason}`, request.url),
      303
    );
  }
}
