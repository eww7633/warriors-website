import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import {
  clearUserOpsRoles,
  getUserOpsAssignments,
  upsertUserOpsRole,
  userHasPermission
} from "@/lib/hq/permissions";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const actor = await getCurrentUser();
  const canManageUsers = actor ? await userHasPermission(actor, "manage_site_users") : false;
  const canAssignOpsRoles = actor ? await userHasPermission(actor, "assign_ops_roles") : false;
  if (!actor || !canManageUsers) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const clearRoles = String(formData.get("clearRoles") ?? "").trim() === "on";
  const roleKey = String(formData.get("roleKey") ?? "").trim();
  const titleLabel = String(formData.get("titleLabel") ?? "").trim();
  const officialEmail = String(formData.get("officialEmail") ?? "").trim();
  const badgeLabel = String(formData.get("badgeLabel") ?? "").trim();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/admin?section=usermanagement";
  const isSuperAdminRole = roleKey === "super_admin";

  try {
    if (isSuperAdminRole && !canAssignOpsRoles) {
      return NextResponse.redirect(
        new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=super_admin_role_restricted`, request.url),
        303
      );
    }

    if (clearRoles || !roleKey) {
      if (!canAssignOpsRoles) {
        const targetAssignments = await getUserOpsAssignments(params.id);
        if (targetAssignments.some((entry) => entry.roleKey === "super_admin")) {
          return NextResponse.redirect(
            new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=super_admin_role_restricted`, request.url),
            303
          );
        }
      }
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

    return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}opsrole=updated`, request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=ops_role_update_failed`, request.url), 303);
  }
}
