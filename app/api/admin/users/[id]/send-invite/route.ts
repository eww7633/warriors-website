import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";
import { readStore } from "@/lib/hq/store";
import { sendInviteEmail } from "@/lib/email";

async function findTargetUser(id: string) {
  if (hasDatabaseUrl()) {
    const user = await getPrismaClient().user.findUnique({
      where: { id },
      select: { id: true, email: true, fullName: true }
    });
    return user
      ? { id: user.id, email: user.email, fullName: user.fullName }
      : null;
  }

  const store = await readStore();
  const user = store.users.find((entry) => entry.id === id);
  return user
    ? { id: user.id, email: user.email, fullName: user.fullName }
    : null;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor)) || !(await userHasPermission(actor, "manage_site_users"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const target = await findTargetUser(params.id);
  if (!target?.email) {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=user_not_found", request.url), 303);
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://pghwarriorhockey.us";
  const registerUrl = `${base}/join?mode=player&invite=1&email=${encodeURIComponent(target.email)}`;

  try {
    await sendInviteEmail({
      to: target.email,
      fullName: target.fullName,
      registerUrl
    });
    return NextResponse.redirect(new URL("/admin?section=contacts&contact=invite_sent", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=invite_send_failed", request.url), 303);
  }
}

