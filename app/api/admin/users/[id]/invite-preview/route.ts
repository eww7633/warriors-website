import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";
import { readStore } from "@/lib/hq/store";
import { buildInviteEmail } from "@/lib/email";

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

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor)) || !(await userHasPermission(actor, "manage_site_users"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const user = await findTargetUser(params.id);
  if (!user) {
    return new NextResponse("User not found.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://pghwarriorhockey.us";
  const registerUrl = `${base}/join?mode=player&invite=1&email=${encodeURIComponent(user.email)}`;
  const message = buildInviteEmail({
    to: user.email,
    fullName: user.fullName,
    registerUrl
  });

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Invite Preview</title></head>
<body style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; padding: 24px; background: #f6f4ec;">
<h2 style="margin: 0 0 8px 0;">Invite Email Preview</h2>
<p style="margin: 0 0 18px 0;"><strong>To:</strong> ${user.email}<br /><strong>Subject:</strong> ${message.subject}</p>
<pre style="white-space: pre-wrap; background: #ffffff; border: 1px solid #d6c7a8; border-radius: 10px; padding: 16px; line-height: 1.45;">${message.text.replace(/</g, "&lt;")}</pre>
</body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}
