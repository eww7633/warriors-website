import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import { deleteNewsPost } from "@/lib/hq/news";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor)) || !(await userHasPermission(actor, "manage_news"))) {
    return NextResponse.redirect(new URL("/admin?section=overview&error=news_admin_required", request.url), 303);
  }

  const formData = await request.formData();
  const postId = String(formData.get("postId") ?? "").trim();

  if (!postId) {
    return NextResponse.redirect(new URL("/admin?section=news&error=missing_news_post_id", request.url), 303);
  }

  await deleteNewsPost(postId);
  return NextResponse.redirect(new URL("/admin?section=news&news=deleted", request.url), 303);
}
