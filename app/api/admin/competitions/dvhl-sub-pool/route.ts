import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { addDvhlSubPoolMember, removeDvhlSubPoolMember } from "@/lib/hq/dvhl";

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };

  const teamId = String(formData.get("teamId") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();
  const action = String(formData.get("action") ?? "add").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const target = returnTo.startsWith("/") ? returnTo : "/admin?section=competitions";

  if (!teamId || !userId) {
    return NextResponse.redirect(new URL(withParam(target, "error", "missing_dvhl_subpool_fields"), request.url), 303);
  }

  try {
    if (action === "remove") {
      await removeDvhlSubPoolMember({ teamId, userId, updatedByUserId: actor.id });
    } else {
      await addDvhlSubPoolMember({ teamId, userId, updatedByUserId: actor.id });
    }

    return NextResponse.redirect(new URL(withParam(target, "dvhl", "subpool_saved"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(target, "error", "dvhl_subpool_save_failed"), request.url), 303);
  }
}
