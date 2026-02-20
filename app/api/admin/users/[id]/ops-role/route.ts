import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { clearUserOpsRoles, isSuperAdmin, upsertUserOpsRole } from "@/lib/hq/permissions";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const actor = await getCurrentUser();
  if (!actor || !(await isSuperAdmin(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const clearRoles = String(formData.get("clearRoles") ?? "").trim() === "on";
  const roleKey = String(formData.get("roleKey") ?? "").trim();
  const titleLabel = String(formData.get("titleLabel") ?? "").trim();
  const officialEmail = String(formData.get("officialEmail") ?? "").trim();
  const badgeLabel = String(formData.get("badgeLabel") ?? "").trim();

  try {
    if (clearRoles || !roleKey) {
      await clearUserOpsRoles({ actorUserId: actor.id, targetUserId: params.id });
    } else {
      await upsertUserOpsRole({
        actorUserId: actor.id,
        targetUserId: params.id,
        roleKey: roleKey as
          | "super_admin"
          | "president"
          | "vp_hockey_ops"
          | "general_manager"
          | "assistant_general_manager"
          | "equipment_manager"
          | "technology_manager"
          | "dvhl_manager"
          | "media_manager",
        titleLabel,
        officialEmail,
        badgeLabel
      });
    }

    return NextResponse.redirect(new URL("/admin?section=players&opsrole=updated", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=players&error=ops_role_update_failed", request.url), 303);
  }
}
